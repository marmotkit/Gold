import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
  Grid,
  Paper,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import MaleIcon from '@mui/icons-material/Male';
import FemaleIcon from '@mui/icons-material/Female';
import AddIcon from '@mui/icons-material/Add';
import { buildApiUrl } from '../config';

function ParticipantCard({ participant, onDelete, onDragStart, onDragEnd, isDragging, isOverflow, isMoved }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px',
        marginBottom: '4px',
        backgroundColor: participant.gender === 'F' ? '#ffebee' : 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        cursor: 'move',
        opacity: isDragging ? 0.5 : 1,
      }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {participant.gender === 'F' ? <FemaleIcon color="secondary" /> : <MaleIcon color="primary" />}
      <Typography sx={{ marginLeft: '8px', flex: 1 }}>
        {participant.name}
        <Typography variant="caption" sx={{ marginLeft: '8px', color: 'text.secondary' }}>
          ({participant.handicap === null ? 'N/A' : participant.handicap})
        </Typography>
      </Typography>
    </Box>
  );
}

function DynamicGrouping({ tournament }) {
  const groupsRef = useRef(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [draggedParticipant, setDraggedParticipant] = useState(null);
  const [draggedFromGroup, setDraggedFromGroup] = useState(null);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [movedParticipants, setMovedParticipants] = useState(new Set());
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    if (tournament) {
      fetchGroups();
    }
  }, [tournament]);

  const fetchGroups = async () => {
    try {
      console.log('開始獲取分組數據...');
      const response = await fetch(buildApiUrl(`/tournaments/${tournament.id}/groups`));
      console.log('分組數據回應狀態:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('獲取分組數據失敗:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('獲取到的分組數據:', data);
      setGroups(data);
    } catch (error) {
      console.error('獲取分組時發生錯誤:', error);
      setError(error.message);
    }
  };

  const showMessage = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setShowSnackbar(true);
  };

  const handleDragStart = (participant, groupId) => {
    setDraggedParticipant(participant);
    setDraggedFromGroup(groupId);
  };

  const handleDragEnd = () => {
    setDraggedParticipant(null);
    setDraggedFromGroup(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (targetGroupId) => {
    if (!draggedParticipant || targetGroupId === draggedFromGroup) return;

    setGroups(prevGroups => {
      // 創建新的分組陣列
      const newGroups = prevGroups.map(group => {
        // 如果是來源組，移除參賽者
        if (group.id === draggedFromGroup) {
          return {
            ...group,
            participants: group.participants.filter(p => p.id !== draggedParticipant.id)
          };
        }
        // 如果是目標組，添加參賽者
        if (group.id === targetGroupId) {
          // 檢查參賽者是否已經在目標組中
          const participantExists = group.participants.some(p => p.id === draggedParticipant.id);
          if (!participantExists) {
            return {
              ...group,
              participants: [...group.participants, draggedParticipant]
            };
          }
        }
        return group;
      });

      // 記錄被移動的參賽者
      setMovedParticipants(prev => new Set([...prev, draggedParticipant.id]));
      setHasChanges(true);
      return newGroups;
    });
  };

  const handleDeleteParticipant = (groupId, participantId) => {
    setGroups(prevGroups => {
      const newGroups = prevGroups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            participants: group.participants.filter(p => p.id !== participantId)
          };
        }
        return group;
      });
      setHasChanges(true);
      return newGroups;
    });
  };

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;

    const newGroup = {
      id: `temp-${Date.now()}`,
      name: newGroupName,
      participants: []
    };

    setGroups(prevGroups => [...prevGroups, newGroup]);
    setNewGroupName('');
    setShowNewGroupDialog(false);
  };

  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(`/tournaments/${tournament.id}/groups`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groups }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '儲存分組失敗');
      }
      
      const data = await response.json();
      showMessage(data.message || '分組已成功儲存', 'success');
      setHasChanges(false);
    } catch (err) {
      console.error('儲存分組錯誤:', err);
      showMessage(err.message || '儲存分組時發生錯誤', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    try {
      window.location.href = `${buildApiUrl(`/tournaments/${tournament.id}/export_groups_diagram_v2`)}`;
      
      setSnackbar({
        open: true,
        message: '分組圖匯出成功',
        severity: 'success'
      });
    } catch (error) {
      console.error('匯出分組圖錯誤:', error);
      setSnackbar({
        open: true,
        message: '匯出分組圖失敗',
        severity: 'error'
      });
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!tournament) return <Typography>請先選擇賽事</Typography>;

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={() => setShowNewGroupDialog(true)}
          startIcon={<AddIcon />}
        >
          新增分組
        </Button>
        {hasChanges && (
          <Button
            variant="contained"
            color="success"
            size="small"
            onClick={handleSaveChanges}
            disabled={loading}
          >
            儲存變更
          </Button>
        )}
        <Button
          variant="contained"
          startIcon={<PictureAsPdfIcon />}
          onClick={handleExportPDF}
          style={{ marginLeft: '10px' }}
        >
          匯出分組圖
        </Button>
      </Box>

      <Box ref={groupsRef}>
        <Grid container spacing={1}>
          {groups.map(group => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={`group-${group.id}`}>
              <Paper
                sx={{
                  p: 1,
                  height: '100%',
                  backgroundColor: '#f5f5f5'
                }}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(group.id)}
              >
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  {group.name} ({group.participants.length} 人)
                </Typography>
                <Box sx={{ 
                  minHeight: 50,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  '& > *:not(:last-child)': { mb: 0.5 }
                }}>
                  {group.participants.map(participant => (
                    <ParticipantCard
                      key={`participant-${participant.id}-group-${group.id}`}
                      participant={participant}
                      onDelete={() => handleDeleteParticipant(group.id, participant.id)}
                      onDragStart={() => handleDragStart(participant, group.id)}
                      onDragEnd={handleDragEnd}
                      isDragging={draggedParticipant?.id === participant.id}
                      isOverflow={group.participants.length > 4}
                      isMoved={movedParticipants.has(participant.id)}
                    />
                  ))}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Dialog open={showNewGroupDialog} onClose={() => setShowNewGroupDialog(false)}>
        <DialogTitle>新增分組</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="分組名稱"
            fullWidth
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewGroupDialog(false)}>取消</Button>
          <Button onClick={handleAddGroup} variant="contained">確定</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default DynamicGrouping;
