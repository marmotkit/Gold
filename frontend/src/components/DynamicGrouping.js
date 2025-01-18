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
  Stack,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import MaleIcon from '@mui/icons-material/Male';
import FemaleIcon from '@mui/icons-material/Female';
import AddIcon from '@mui/icons-material/Add';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { buildApiUrl } from '../config';

function ParticipantCard({ 
  participant, 
  onDelete, 
  onDragStart, 
  onDragEnd, 
  isDragging, 
  isOverflow, 
  isMoved,
  onToggleCheckIn 
}) {
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
      <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        <Typography>
          {participant.name}
          <Typography 
            component="span" 
            sx={{ 
              ml: 1,
              color: 'text.secondary',
              fontSize: '0.8rem'
            }}
          >
            ({participant.handicap || 'N/A'})
          </Typography>
        </Typography>
      </Box>
      
      <IconButton 
        size="small" 
        onClick={(e) => {
          e.stopPropagation();
          onToggleCheckIn(participant);
        }}
        sx={{ 
          color: participant.checked_in ? 'success.main' : 'action.disabled',
          '&:hover': {
            color: participant.checked_in ? 'success.dark' : 'action.active'
          }
        }}
      >
        {participant.checked_in ? 
          <CheckCircleIcon sx={{ fontSize: '1.2rem' }} /> : 
          <RadioButtonUncheckedIcon sx={{ fontSize: '1.2rem' }} />
        }
      </IconButton>
      
      {participant.gender === 'M' ? (
        <MaleIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
      ) : (
        <FemaleIcon sx={{ fontSize: '1rem', color: 'error.main' }} />
      )}
      
      <IconButton 
        size="small" 
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        sx={{ ml: 0.5 }}
      >
        <DeleteIcon sx={{ fontSize: '1rem' }} />
      </IconButton>
    </Box>
  );
}

function DynamicGrouping({ tournament, onGroupsUpdated }) {
  const groupsRef = useRef(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [draggedParticipant, setDraggedParticipant] = useState(null);
  const [draggedFromGroup, setDraggedFromGroup] = useState(null);
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [movedParticipants, setMovedParticipants] = useState(new Set());
  const [lockedGroups, setLockedGroups] = useState(new Set());
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // 載入分組資料
  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(`/tournaments/${tournament.id}/groups`));
      if (!response.ok) {
        throw new Error('載入分組資料失敗');
      }
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error('載入分組錯誤:', error);
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // 處理報到狀態切換
  const handleToggleCheckIn = async (participant) => {
    try {
      const response = await fetch(
        buildApiUrl(`/tournaments/${tournament.id}/participants/${participant.id}/check-in`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            checked_in: !participant.checked_in
          })
        }
      );

      if (!response.ok) {
        throw new Error('更新報到狀態失敗');
      }

      // 更新本地狀態
      setGroups(prevGroups => 
        prevGroups.map(group => ({
          ...group,
          participants: group.participants.map(p => 
            p.id === participant.id
              ? { ...p, checked_in: !p.checked_in }
              : p
          )
        }))
      );

      setSnackbar({
        open: true,
        message: '報到狀態已更新',
        severity: 'success'
      });

    } catch (error) {
      console.error('更新報到狀態錯誤:', error);
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    }
  };

  // 添加報到處理函數
  const handleCheckIn = async (participant) => {
    try {
      const method = participant.checked_in ? 'DELETE' : 'PUT';
      const response = await fetch(`${API_BASE_URL}/tournaments/${tournamentId}/participants/${participant.id}/check-in`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        // 更新本地狀態
        setGroups(prevGroups => 
          prevGroups.map(group => ({
            ...group,
            participants: group.participants.map(p => 
              p.id === participant.id ? data.participant : p
            )
          }))
        );
        message.success(data.message);
      } else {
        console.error(participant.checked_in ? '取消報到失敗:' : '報到失敗:', data.message);
        message.error(data.message);
      }
    } catch (error) {
      console.error('處理報到狀態時發生錯誤:', error);
      message.error('處理報到狀態時發生錯誤');
    }
  };

  useEffect(() => {
    if (tournament) {
      loadGroups();
    }
  }, [tournament]);

  const showMessage = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setShowSnackbar(true);
  };

  const handleDragStart = (e, participant, groupId) => {
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

  const handleDrop = async (e, targetGroupId) => {
    e.preventDefault();
    if (!draggedParticipant || draggedFromGroup === targetGroupId) return;

    try {
      // 更新分組
      const updatedGroups = groups.map(group => {
        if (group.id === draggedFromGroup) {
          return {
            ...group,
            participants: group.participants.filter(p => p.id !== draggedParticipant.id)
          };
        }
        if (group.id === targetGroupId) {
          return {
            ...group,
            participants: [...group.participants, draggedParticipant]
          };
        }
        return group;
      });

      setGroups(updatedGroups);
      
      // 發送更新到後端
      const response = await fetch(buildApiUrl(`/tournaments/${tournament.id}/save_groups`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groups: updatedGroups })
      });

      if (!response.ok) {
        throw new Error('更新分組失敗');
      }

      setSnackbar({
        open: true,
        message: '分組更新成功',
        severity: 'success'
      });

    } catch (error) {
      console.error('更新分組失敗:', error);
      setSnackbar({
        open: true,
        message: error.message || '更新分組失敗',
        severity: 'error'
      });
    }
  };

  const handleDeleteParticipant = (groupId, participantId) => {
    if (lockedGroups.has(groupId)) {
      showMessage('無法修改已鎖定的分組', 'warning');
      return;
    }
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
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groups)
      });

      if (!response.ok) {
        throw new Error('保存分組失敗');
      }

      setHasChanges(false);
      setMovedParticipants(new Set());
      setSnackbar({
        open: true,
        message: '分組已保存',
        severity: 'success'
      });

    } catch (error) {
      console.error('保存分組錯誤:', error);
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportDiagram = async () => {
    try {
      const response = await fetch(`${API_URL}/tournaments/${tournamentId}/export_groups_diagram`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('匯出失敗');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tournamentName}_分組圖.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('匯出分組圖時發生錯誤:', error);
      message.error('匯出分組圖失敗');
    }
  };

  const handleToggleLock = (groupId) => {
    setLockedGroups(prev => {
      const newLocked = new Set(prev);
      if (newLocked.has(groupId)) {
        newLocked.delete(groupId);
      } else {
        newLocked.add(groupId);
      }
      return newLocked;
    });
  };

  const renderParticipantActions = (participant) => (
    <Stack spacing={2}>
      {participant.checked_in ? (
        <Button 
          type="primary" 
          danger
          onClick={() => handleCheckIn(participant)}
        >
          取消報到
        </Button>
      ) : (
        <Button 
          type="primary"
          onClick={() => handleCheckIn(participant)}
        >
          報到
        </Button>
      )}
    </Stack>
  );

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!tournament) return <Typography>請先選擇賽事</Typography>;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowNewGroupDialog(true)}
        >
          新增分組
        </Button>

        <Button
          variant="contained"
          onClick={handleSaveChanges}
          disabled={!hasChanges || loading}
          sx={{ ml: 1 }}
        >
          保存更改
        </Button>

        <Button
          variant="contained"
          startIcon={<PictureAsPdfIcon />}
          onClick={handleExportDiagram}
          disabled={loading}
          sx={{ ml: 1 }}
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
                  backgroundColor: '#f5f5f5',
                  position: 'relative'
                }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, group.id)}
              >
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mb: 1 
                }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    {group.name} ({group.participants.length} 人)
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => handleToggleLock(group.id)}
                    color={lockedGroups.has(group.id) ? "primary" : "default"}
                  >
                    {lockedGroups.has(group.id) ? <LockIcon /> : <LockOpenIcon />}
                  </IconButton>
                </Box>
                <Box sx={{ 
                  minHeight: 50,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  '& > *:not(:last-child)': { mb: 0.5 },
                  opacity: lockedGroups.has(group.id) ? 0.7 : 1,
                  pointerEvents: lockedGroups.has(group.id) ? 'none' : 'auto'
                }}>
                  {group.participants.map(participant => (
                    <ParticipantCard
                      key={`participant-${participant.id}-group-${group.id}`}
                      participant={participant}
                      onDelete={() => handleDeleteParticipant(group.id, participant.id)}
                      onDragStart={(e) => handleDragStart(e, participant, group.id)}
                      onDragEnd={handleDragEnd}
                      isDragging={draggedParticipant?.id === participant.id}
                      isOverflow={group.participants.length > 4}
                      isMoved={movedParticipants.has(participant.id)}
                      onToggleCheckIn={handleToggleCheckIn}
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
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default DynamicGrouping;
