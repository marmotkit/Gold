import React, { useState, useEffect } from 'react';
import {
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Snackbar,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
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
      setParticipants(data || []);
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
      const response = await fetch(`${config.API_BASE_URL}/api/v1/tournaments/${tournament.id}/save-groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ participants }),
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

  // 渲染分組結果
  return (
    <div>
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item>
            <Button
              variant="contained"
              onClick={() => setAutoGroupDialogOpen(true)}
              disabled={loading}
            >
              自動分組
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              onClick={handleSaveGroups}
              disabled={loading}
            >
              保存分組
            </Button>
          </Grid>
        </Grid>
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
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>報名序號</TableCell>
                  <TableCell>會員編號</TableCell>
                  <TableCell>姓名</TableCell>
                  <TableCell>差點</TableCell>
                  <TableCell>預分組編號</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupParticipants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell>{participant.registration_number}</TableCell>
                    <TableCell>{participant.member_number}</TableCell>
                    <TableCell>{participant.name}</TableCell>
                    <TableCell>{participant.handicap}</TableCell>
                    <TableCell>{participant.pre_group_code}</TableCell>
                  </TableRow>
                ))}
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
