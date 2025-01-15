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
        flexDirection: 'row',
        alignItems: 'center',
        p: 0.5,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        '&:hover': {
          bgcolor: 'action.hover'
        },
        ...(isOverflow && {
          backgroundColor: '#fff3e0',
          border: '1px solid #ffe0b2',
          borderRadius: '4px'
        }),
        ...(isMoved && {
          backgroundColor: '#fff9c4',
          border: '1px solid #fff59d',
          borderRadius: '4px'
        }),
        fontSize: '0.85rem',
        minHeight: '32px'
      }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <Typography variant="body2" sx={{ flexGrow: 1, fontSize: 'inherit' }}>
        {participant.name}
      </Typography>
      {participant.gender === 'M' ? (
        <MaleIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
      ) : (
        <FemaleIcon sx={{ fontSize: '1rem', color: 'error.main' }} />
      )}
      <IconButton size="small" onClick={onDelete} sx={{ ml: 0.5 }}>
        <DeleteIcon sx={{ fontSize: '1rem' }} />
      </IconButton>
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

  const exportToPDF = async () => {
    try {
      setLoading(true);
      const element = groupsRef.current;
      
      // 創建一個新的視窗來顯示列印內容
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('無法開啟列印視窗，請檢查是否被瀏覽器阻擋');
      }

      // 設置列印視窗的內容
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${tournament.name} - 分組表</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 20px;
                color: #000;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              .title {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
              }
              .date {
                font-size: 14px;
                color: #666;
              }
              .groups-container {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 20px;
                margin-top: 20px;
              }
              .group {
                border: 1px solid #ccc;
                padding: 10px;
                background-color: #f5f5f5;
                break-inside: avoid;
              }
              .group-title {
                font-weight: bold;
                margin-bottom: 10px;
                font-size: 16px;
              }
              .participant {
                padding: 5px;
                margin-bottom: 5px;
                background-color: white;
                border: 1px solid #ddd;
                border-radius: 4px;
              }
              .moved {
                background-color: #fff9c4;
              }
              .female {
                background-color: #fce4ec;
              }
              @media print {
                @page {
                  size: A4;
                  margin: 1cm;
                }
                body {
                  margin: 0;
                }
                .group {
                  page-break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">${tournament.name} - 分組表</div>
              <div class="date">匯出日期: ${new Date().toLocaleDateString('zh-TW')}</div>
            </div>
            <div class="groups-container">
              ${groups.map(group => `
                <div class="group">
                  <div class="group-title">${group.name} (${group.participants.length} 人)</div>
                  ${group.participants.map(participant => `
                    <div class="participant ${participant.gender === 'F' ? 'female' : ''} ${movedParticipants.has(participant.id) ? 'moved' : ''}">
                      ${participant.name}
                      ${participant.gender === 'F' ? '👩' : '👨'}
                    </div>
                  `).join('')}
                </div>
              `).join('')}
            </div>
          </body>
        </html>
      `);

      // 等待樣式載入
      setTimeout(() => {
        printWindow.document.close();
        printWindow.print();
        // 當使用者完成列印後關閉視窗
        printWindow.onafterprint = () => {
          printWindow.close();
        };
        setLoading(false);
      }, 500);

    } catch (error) {
      console.error('列印錯誤:', error);
      showMessage(error.message || '列印失敗', 'error');
      setLoading(false);
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
          color="info"
          startIcon={<PictureAsPdfIcon />}
          onClick={exportToPDF}
          disabled={loading}
        >
          匯出 PDF
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
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={() => setShowSnackbar(false)}
      >
        <Alert onClose={() => setShowSnackbar(false)} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default DynamicGrouping;
