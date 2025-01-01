import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { apiConfig } from '../config';

function TournamentManagement({ onTournamentSelect }) {
  const [tournaments, setTournaments] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    date: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      console.log('開始載入賽事列表...');
      setLoading(true);

      const response = await fetch(`${apiConfig.apiUrl}/tournaments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        credentials: 'include'
      });

      console.log('API 回應狀態:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('接收到的數據:', data);
      setTournaments(data);
    } catch (error) {
      console.error('載入賽事列表時發生錯誤:', error);
      setSnackbar({
        open: true,
        message: '載入賽事列表失敗',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(`${apiConfig.apiUrl}/tournaments`, {
        method: editingTournament ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          date: formData.date
        }),
        mode: 'cors',
        credentials: 'include'
      });

      console.log('API 回應狀態:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('接收到的數據:', result);

      // 清空表單並關閉對話框
      setFormData({
        name: '',
        date: ''
      });
      setOpenDialog(false);
      setEditingTournament(null);

      // 顯示成功訊息
      setSnackbar({
        open: true,
        message: editingTournament ? '賽事更新成功' : '賽事建立成功',
        severity: 'success',
      });

      // 更新賽事列表
      setTournaments(prevTournaments => {
        if (editingTournament) {
          return prevTournaments.map(t => t.id === result.id ? result : t);
        } else {
          return [...prevTournaments, result];
        }
      });

      // 重新載入賽事列表以確保數據同步
      await loadTournaments();

    } catch (error) {
      console.error('保存賽事時發生錯誤:', error);
      setSnackbar({
        open: true,
        message: '保存賽事失敗',
        severity: 'error',
      });
    }
  };

  const handleEdit = (tournament) => {
    setEditingTournament(tournament);
    setFormData({
      name: tournament.name,
      date: tournament.date
    });
    setOpenDialog(true);
  };

  const handleDelete = async (id) => {
    try {
      console.log(`開始刪除賽事 ID：${id}`);
      const response = await fetch(`${apiConfig.apiUrl}/tournaments/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        credentials: 'include'
      });

      console.log('API 回應狀態:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('賽事刪除成功');
      
      // 更新本地狀態
      setTournaments(prevTournaments => prevTournaments.filter(t => t.id !== id));

      setSnackbar({
        open: true,
        message: '賽事刪除成功',
        severity: 'success'
      });

      // 重新載入賽事列表以確保數據同步
      await loadTournaments();

    } catch (error) {
      console.error('刪除賽事時發生錯誤:', error);
      setSnackbar({
        open: true,
        message: '刪除賽事失敗',
        severity: 'error'
      });
    }
  };

  return (
    <div>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">賽事管理</Typography>
        <Button
          variant="contained"
          onClick={() => {
            setEditingTournament(null);
            setFormData({ name: '', date: '' });
            setOpenDialog(true);
          }}
        >
          新增賽事
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>賽事名稱</TableCell>
              <TableCell>日期</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tournaments.map((tournament) => (
              <TableRow
                key={tournament.id}
                sx={{ 
                  '&:last-child td, &:last-child th': { border: 0 },
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#f5f5f5' }
                }}
                onClick={() => onTournamentSelect(tournament)}
              >
                <TableCell 
                  onClick={(e) => {
                    e.stopPropagation();
                    onTournamentSelect(tournament);
                  }}
                  sx={{ cursor: 'pointer' }}
                >{tournament.name}</TableCell>
                <TableCell 
                  onClick={(e) => {
                    e.stopPropagation();
                    onTournamentSelect(tournament);
                  }}
                  sx={{ cursor: 'pointer' }}
                >{tournament.date}</TableCell>
                <TableCell align="right">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(tournament);
                    }}
                    color="primary"
                    size="small"
                  >
                    編輯
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(tournament.id);
                    }}
                    color="error"
                    size="small"
                  >
                    刪除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingTournament ? '編輯賽事' : '新增賽事'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                autoFocus
                margin="dense"
                label="賽事名稱"
                type="text"
                fullWidth
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <TextField
                margin="dense"
                label="日期"
                type="date"
                fullWidth
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>取消</Button>
            <Button type="submit" variant="contained">
              {editingTournament ? '更新' : '新增'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default TournamentManagement;
