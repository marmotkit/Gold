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
  const [error, setError] = useState(null);

  const apiConfig = {
    apiUrl: process.env.NODE_ENV === 'production'
      ? 'https://gold-1.onrender.com/api/v1'
      : 'http://localhost:8000/api/v1'
  };

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    const timeout = 5000; // 5 seconds

    const fetchWithTimeout = async (url, options, timeout) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(id);
        return response;
      } catch (error) {
        clearTimeout(id);
        throw error;
      }
    };

    const fetchWithRetry = async () => {
      try {
        console.log(`嘗試載入賽事列表... (重試次數: ${retryCount})`);
        setLoading(true);
        setError(null);

        const response = await fetchWithTimeout(
          `${apiConfig.apiUrl}/tournaments`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            mode: 'cors'
          },
          timeout
        );

        console.log('API 回應狀態:', response.status);
        console.log('API 回應頭部:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API 錯誤回應:', errorText);
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('接收到的數據:', data);
        setTournaments(data);
        return true;
      } catch (error) {
        console.error(`載入賽事列表時發生錯誤 (重試次數: ${retryCount}):`, error);
        
        if (error.name === 'AbortError') {
          console.error('請求超時');
          throw new Error('請求超時，請稍後再試');
        }
        
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`等待 ${retryDelay}ms 後重試...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return false;
        }
        
        setError(error.message);
        setSnackbar({
          open: true,
          message: '載入賽事列表失敗：' + error.message,
          severity: 'error'
        });
        throw error;
      } finally {
        if (retryCount >= maxRetries) {
          setLoading(false);
        }
      }
    };

    while (retryCount <= maxRetries) {
      const success = await fetchWithRetry();
      if (success) {
        setLoading(false);
        break;
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000;
    const timeout = 5000;

    const fetchWithTimeout = async (url, options, timeout) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(id);
        return response;
      } catch (error) {
        clearTimeout(id);
        throw error;
      }
    };

    const submitWithRetry = async () => {
      try {
        console.log(`嘗試保存賽事... (重試次數: ${retryCount})`);
        setLoading(true);
        setError(null);

        const response = await fetchWithTimeout(
          `${apiConfig.apiUrl}/tournaments`,
          {
            method: editingTournament ? 'PUT' : 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            mode: 'cors',
            body: JSON.stringify({
              name: formData.name,
              date: formData.date
            })
          },
          timeout
        );

        console.log('API 回應狀態:', response.status);
        console.log('API 回應頭部:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API 錯誤回應:', errorText);
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('接收到的數據:', data);

        setFormData({ name: '', date: '' });
        setOpenDialog(false);
        setEditingTournament(null);

        setSnackbar({
          open: true,
          message: '賽事保存成功',
          severity: 'success'
        });

        await loadTournaments();
        return true;
      } catch (error) {
        console.error(`保存賽事時發生錯誤 (重試次數: ${retryCount}):`, error);
        
        if (error.name === 'AbortError') {
          console.error('請求超時');
          throw new Error('請求超時，請稍後再試');
        }
        
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`等待 ${retryDelay}ms 後重試...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return false;
        }
        
        setError(error.message);
        setSnackbar({
          open: true,
          message: '保存賽事失敗：' + error.message,
          severity: 'error'
        });
        throw error;
      } finally {
        if (retryCount >= maxRetries) {
          setLoading(false);
        }
      }
    };

    while (retryCount <= maxRetries) {
      const success = await submitWithRetry();
      if (success) {
        setLoading(false);
        break;
      }
    }
  };

  const handleDelete = async (id) => {
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000;
    const timeout = 5000;

    const fetchWithTimeout = async (url, options, timeout) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(id);
        return response;
      } catch (error) {
        clearTimeout(id);
        throw error;
      }
    };

    const deleteWithRetry = async () => {
      try {
        console.log(`嘗試刪除賽事... (重試次數: ${retryCount})`);
        setLoading(true);
        setError(null);

        const response = await fetchWithTimeout(
          `${apiConfig.apiUrl}/tournaments/${id}`,
          {
            method: 'DELETE',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            mode: 'cors'
          },
          timeout
        );

        console.log('API 回應狀態:', response.status);
        console.log('API 回應頭部:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API 錯誤回應:', errorText);
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        console.log('賽事刪除成功');
        
        setSnackbar({
          open: true,
          message: '賽事刪除成功',
          severity: 'success'
        });

        await loadTournaments();
        return true;
      } catch (error) {
        console.error(`刪除賽事時發生錯誤 (重試次數: ${retryCount}):`, error);
        
        if (error.name === 'AbortError') {
          console.error('請求超時');
          throw new Error('請求超時，請稍後再試');
        }
        
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`等待 ${retryDelay}ms 後重試...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return false;
        }
        
        setError(error.message);
        setSnackbar({
          open: true,
          message: '刪除賽事失敗：' + error.message,
          severity: 'error'
        });
        throw error;
      } finally {
        if (retryCount >= maxRetries) {
          setLoading(false);
        }
      }
    };

    while (retryCount <= maxRetries) {
      const success = await deleteWithRetry();
      if (success) {
        setLoading(false);
        break;
      }
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

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress aria-label="載入中" />
        </Box>
      ) : (
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
      )}

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
