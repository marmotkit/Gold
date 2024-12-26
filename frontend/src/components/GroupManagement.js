import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Grid,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import config from '../config';
import { FaMale, FaFemale } from 'react-icons/fa';

function GroupManagement({ tournament }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoGroupDialogOpen, setAutoGroupDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [groups, setGroups] = useState({
    '未分組': [],
  });

  // 獲取參賽者數據
  useEffect(() => {
    fetchParticipants();
  }, [tournament]);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${config.API_BASE_URL}/api/v1/tournaments/${tournament.id}/participants`
      );
      if (!response.ok) {
        throw new Error('獲取參賽者失敗');
      }
      const data = await response.json();
      
      // 初始化分組數據
      const newGroups = {
        '未分組': []
      };
      
      // 將參賽者按分組整理
      data.forEach(participant => {
        const groupCode = participant.group_code || '未分組';
        if (!newGroups[groupCode]) {
          newGroups[groupCode] = [];
        }
        newGroups[groupCode].push(participant);
      });

      // 確保每個分組內的參賽者按 group_order 排序
      Object.keys(newGroups).forEach(groupCode => {
        newGroups[groupCode].sort((a, b) => (a.group_order || 0) - (b.group_order || 0));
      });

      setGroups(newGroups);
      setParticipants(data);
    } catch (error) {
      console.error('Error fetching participants:', error);
      setSnackbarMessage('獲取參賽者失敗');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // 處理拖放結束事件
  const handleDragEnd = (result) => {
    const { source, destination } = result;

    // 如果沒有目標或目標與來源相同，不做任何操作
    if (!destination || 
        (source.droppableId === destination.droppableId && 
         source.index === destination.index)) {
      return;
    }

    // 複製當前分組狀態
    const newGroups = { ...groups };

    // 從來源分組中移除參賽者
    const [participant] = newGroups[source.droppableId].splice(source.index, 1);

    // 確保目標分組存在
    if (!newGroups[destination.droppableId]) {
      newGroups[destination.droppableId] = [];
    }

    // 將參賽者添加到目標分組
    newGroups[destination.droppableId].splice(destination.index, 0, participant);

    // 更新分組狀態
    setGroups(newGroups);
    setHasUnsavedChanges(true);
  };

  // 保存分組
  const handleSaveGroups = async () => {
    try {
      setLoading(true);

      // 準備要發送的數據
      const updatedParticipants = [];
      Object.entries(groups).forEach(([groupCode, participants]) => {
        participants.forEach((participant, index) => {
          updatedParticipants.push({
            id: participant.id,
            group_code: groupCode === '未分組' ? null : groupCode,
            group_order: index
          });
        });
      });

      // 發送更新請求
      const response = await fetch(
        `${config.API_BASE_URL}/api/v1/tournaments/${tournament.id}/groups`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ participants: updatedParticipants }),
        }
      );

      if (!response.ok) {
        throw new Error('保存分組失敗');
      }

      setSnackbarMessage('保存成功');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setHasUnsavedChanges(false);

      // 重新獲取最新數據
      await fetchParticipants();
    } catch (error) {
      console.error('Error saving groups:', error);
      setSnackbarMessage('保存失敗');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // 導出分組結果為 Excel
  const handleExportGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${config.API_BASE_URL}/api/v1/tournaments/${tournament.id}/groups/export`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('導出失敗');
      }

      // 獲取文件名
      const contentDisposition = response.headers.get('content-disposition');
      let filename = '分組結果.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      // 下載文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSnackbarMessage('導出成功');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error exporting groups:', error);
      setSnackbarMessage('導出失敗');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // 添加新分組
  const handleAddGroup = () => {
    const groupNumbers = Object.keys(groups)
      .filter(key => key !== '未分組')
      .map(key => parseInt(key.split(' ')[1]))
      .filter(num => !isNaN(num));

    const maxGroupNumber = Math.max(0, ...groupNumbers);
    const newGroupCode = `第 ${maxGroupNumber + 1} 組`;
    
    setGroups(prev => ({
      ...prev,
      [newGroupCode]: []
    }));
    setHasUnsavedChanges(true);
  };

  // 刪除分組
  const handleDeleteGroup = (groupCode) => {
    const newGroups = { ...groups };
    // 將該分組的參賽者移到未分組
    newGroups['未分組'] = [...newGroups['未分組'], ...newGroups[groupCode]];
    delete newGroups[groupCode];
    setGroups(newGroups);
    setHasUnsavedChanges(true);
  };

  // 自動分組
  const handleAutoGroup = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${config.API_BASE_URL}/api/v1/tournaments/${tournament.id}/auto-group`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error('自動分組失敗');
      }

      setAutoGroupDialogOpen(false);
      setSnackbarMessage('自動分組完成');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

      // 重新獲取參賽者數據
      await fetchParticipants();
    } catch (error) {
      console.error('Error in auto grouping:', error);
      setSnackbarMessage('自動分組失敗');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // 切換性別
  const toggleGender = async (participant) => {
    try {
      const newGender = participant.gender === 'M' ? 'F' : 'M';
      const response = await fetch(`${config.API_BASE_URL}/api/v1/participants/${participant.id}/gender`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gender: newGender }),
      });
      if (response.ok) {
        // 重新載入資料
        fetchParticipants();
      } else {
        console.error('Failed to update gender');
      }
    } catch (error) {
      console.error('Error updating gender:', error);
    }
  };

  // 渲染分組
  const renderGroup = (groupCode, participants, provided) => (
    <Paper 
      {...provided.droppableProps}
      ref={provided.innerRef}
      sx={{ 
        m: 1, 
        p: 1,
        minHeight: 100,
        backgroundColor: groupCode === '未分組' ? '#fff3e0' : '#fff'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">
          {groupCode}
          <Chip 
            label={`${participants.length} 人`} 
            size="small" 
            sx={{ ml: 1 }}
          />
        </Typography>
        {groupCode !== '未分組' && (
          <Button
            size="small"
            startIcon={<DeleteIcon />}
            onClick={() => handleDeleteGroup(groupCode)}
          >
            刪除分組
          </Button>
        )}
      </Box>
      {participants.map((participant, index) => (
        <Draggable
          key={participant.id}
          draggableId={participant.id.toString()}
          index={index}
        >
          {(provided) => (
            <Paper
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              sx={{ 
                p: 1, 
                mb: 1, 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f5f5f5'
              }}
            >
              <Box>
                <Typography variant="body2" color="textSecondary">
                  {participant.registration_number} / {participant.member_number}
                </Typography>
                <Typography>
                  {participant.name} ({participant.handicap})
                  <Button 
                    variant="link" 
                    onClick={() => toggleGender(participant)}
                    style={{ padding: '0 5px' }}
                  >
                    {participant.gender === 'F' ? 
                        <FaFemale style={{ color: 'pink' }} /> : 
                        <FaMale style={{ color: 'blue' }} />
                    }
                  </Button>
                </Typography>
              </Box>
              {participant.pre_group_code && (
                <Chip 
                  label={`預分組: ${participant.pre_group_code}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Paper>
          )}
        </Draggable>
      ))}
      {provided.placeholder}
    </Paper>
  );

  return (
    <div>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button
          variant="contained"
          onClick={() => setAutoGroupDialogOpen(true)}
          disabled={loading}
          color="primary"
        >
          自動分組
        </Button>
        <Button
          variant="contained"
          onClick={handleSaveGroups}
          disabled={loading || !hasUnsavedChanges}
          startIcon={<SaveIcon />}
        >
          儲存分組
        </Button>
        <Button
          variant="contained"
          onClick={handleExportGroups}
          disabled={loading}
          startIcon={<DownloadIcon />}
          color="secondary"
        >
          匯出 Excel
        </Button>
        <Button
          variant="outlined"
          onClick={handleAddGroup}
          disabled={loading}
        >
          新增分組
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', m: 2 }}>
          <CircularProgress />
        </Box>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Grid container>
          {Object.entries(groups).map(([groupCode, participants]) => (
            <Grid item xs={12} md={6} lg={4} key={groupCode}>
              <Droppable droppableId={groupCode}>
                {(provided) => renderGroup(groupCode, participants, provided)}
              </Droppable>
            </Grid>
          ))}
        </Grid>
      </DragDropContext>

      <Dialog open={autoGroupDialogOpen} onClose={() => setAutoGroupDialogOpen(false)}>
        <DialogTitle>自動分組設定</DialogTitle>
        <DialogContent>
          {/* 自動分組設定的內容 */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAutoGroupDialogOpen(false)}>取消</Button>
          <Button onClick={handleAutoGroup} variant="contained">
            開始分組
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default GroupManagement;
