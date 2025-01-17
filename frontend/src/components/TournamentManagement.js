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
import { buildApiUrl } from '../config';

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

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const response = await fetch(buildApiUrl('/tournaments'), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error('獲取賽事列表失敗');
      }

      const data = await response.json();
      setTournaments(data);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      setSnackbar({
        open: true,
        message: '獲取賽事列表失敗',
        severity: 'error'
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 2000;
    const timeout = 30000;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(buildApiUrl('/tournaments'), {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          date: formData.date
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存失敗');
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

      await fetchTournaments();

    } catch (error) {
      console.error('保存賽事時發生錯誤:', error);
      setError(error.message);
      setSnackbar({
        open: true,
        message: '保存賽事失敗：' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000;

    const deleteWithRetry = async () => {
        try {
            console.log(`嘗試刪除賽事... (重試次數: ${retryCount})`);
            setLoading(true);
            setError(null);

            const response = await fetch(`${buildApiUrl(`/tournaments/${id}`)}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '刪除失敗');
            }

            setSnackbar({
                open: true,
                message: '賽事刪除成功',
                severity: 'success'
            });

            await fetchTournaments();
            return true;

        } catch (error) {
            console.error(`刪除賽事時發生錯誤 (重試次數: ${retryCount}):`, error);
            
            if (retryCount < maxRetries) {
                retryCount++;
                console.log(`等待 ${retryDelay}ms 後重試...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return deleteWithRetry();
            }
            
            setError(error.message);
            setSnackbar({
                open: true,
                message: '刪除賽事失敗：' + error.message,
                severity: 'error'
            });
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return deleteWithRetry();
  };

  const handleEdit = (tournament) => {
    setEditingTournament(tournament);
    setFormData({
      name: tournament.name,
      date: tournament.date
    });
    setOpenDialog(true);
  };

  const handleParticipantUpdated = (updatedParticipant) => {
    // 更新報到管理的狀態
    if (checkInRef.current) {
        checkInRef.current.updateParticipant(updatedParticipant);
    }
    
    // 更新分組管理的狀態
    if (groupingRef.current) {
        groupingRef.current.updateParticipant(updatedParticipant);
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
