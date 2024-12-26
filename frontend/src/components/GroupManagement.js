import React, { useState, useEffect } from 'react';
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

function GroupManagement({ tournament }) {
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState(null);
  const [autoGroupDialogOpen, setAutoGroupDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // 獲取分組結果
  const fetchGroups = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/v1/tournaments/${tournament.id}/groups`);
      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }
      const data = await response.json();
      
      // 將參賽者按差點排序（每組單獨排序）
      const sortedData = data.map(participant => {
        const groupCode = participant.group_code || '';
        return {
          ...participant,
          handicap: parseFloat(participant.handicap || 0)  // 確保差點是數字
        };
      }).sort((a, b) => {
        // 先按組別分組
        if (a.group_code !== b.group_code) {
          return (a.group_code || '').localeCompare(b.group_code || '');
        }
        // 同組內按差點排序
        return a.handicap - b.handicap;
      });
      
      setParticipants(sortedData || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  useEffect(() => {
    if (tournament?.id) {
      fetchGroups();
    }
  }, [tournament]);

  // 自動分組
  const handleAutoGroup = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.API_BASE_URL}/api/v1/tournaments/${tournament.id}/auto-group`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to auto group');
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      // 重新獲取分組結果
      await fetchGroups();
      setSnackbarMessage('自動分組完成');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setAutoGroupDialogOpen(false);
    } catch (error) {
      console.error('Error in auto grouping:', error);
      setSnackbarMessage(`自動分組失敗：${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // 保存分組結果
  const handleSaveGroups = async () => {
    try {
      setLoading(true);
      // 將參賽者資料轉換為以分組為鍵的對象
      const groupedParticipants = participants.reduce((acc, participant) => {
        const groupCode = participant.group_code || 'ungrouped';
        if (!acc[groupCode]) {
          acc[groupCode] = [];
        }
        acc[groupCode].push(participant);
        return acc;
      }, {});

      const response = await fetch(`${config.API_BASE_URL}/api/v1/tournaments/${tournament.id}/groups`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupedParticipants),
      });
      if (!response.ok) {
        throw new Error('Failed to save groups');
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      // 重新獲取分組結果
      await fetchGroups();
      setSnackbarMessage('儲存分組成功');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error saving groups:', error);
      setSnackbarMessage(`儲存分組失敗：${error.message}`);
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

  // 按分組整理參賽者
  const groupedParticipants = {};
  if (participants && Array.isArray(participants)) {
    participants.forEach(participant => {
      const groupNumber = participant.group_code || 'None';
      if (!groupedParticipants[groupNumber]) {
        groupedParticipants[groupNumber] = [];
      }
      groupedParticipants[groupNumber].push(participant);
    });
  }

  // 更新備註
  const handleNotesChange = async (participantId, notes) => {
    try {
      setLoading(true);
      const response = await fetch(`${config.API_BASE_URL}/api/v1/participants/${participantId}/notes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notes');
      }

      // 更新本地狀態
      setParticipants(prevParticipants =>
        prevParticipants.map(p =>
          p.id === participantId ? { ...p, notes } : p
        )
      );

      setSnackbarMessage('備註更新成功');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error updating notes:', error);
      setSnackbarMessage('備註更新失敗');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const renderParticipantRow = (participant) => (
    <TableRow key={participant.id}>
      <TableCell>{participant.registration_number}</TableCell>
      <TableCell>{participant.member_number}</TableCell>
      <TableCell>{participant.name}</TableCell>
      <TableCell>{participant.handicap}</TableCell>
      <TableCell>{participant.pre_group_code}</TableCell>
      <TableCell>
        <TextField
          value={participant.notes || ''}
          onChange={(e) => handleNotesChange(participant.id, e.target.value)}
          placeholder="備註"
          variant="standard"
          fullWidth
        />
      </TableCell>
    </TableRow>
  );

  // 渲染分組結果
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
          disabled={loading}
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
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {Object.entries(groupedParticipants).map(([groupNumber, groupParticipants]) => (
        <Paper key={groupNumber} sx={{ mb: 2, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {groupNumber === 'None' ? '未分組' : `第 ${groupNumber} 組`}
          </Typography>
          <TableContainer component={Paper} style={{ marginTop: '20px' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>報名序號</TableCell>
                  <TableCell>會員編號</TableCell>
                  <TableCell>姓名</TableCell>
                  <TableCell>差點</TableCell>
                  <TableCell>預分組編號</TableCell>
                  <TableCell>備註</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupParticipants.map(renderParticipantRow)}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}

      {/* 自動分組確認對話框 */}
      <Dialog open={autoGroupDialogOpen} onClose={() => setAutoGroupDialogOpen(false)}>
        <DialogTitle>確認自動分組</DialogTitle>
        <DialogContent>
          確定要執行自動分組嗎？這將會重新分配所有參賽者的組別。
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAutoGroupDialogOpen(false)}>取消</Button>
          <Button onClick={handleAutoGroup} variant="contained" color="primary">
            確定
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for messages */}
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
