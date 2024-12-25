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
  IconButton,
  Typography,
  Box,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import config from '../config';

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
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.API_BASE_URL}/api/v1/tournaments`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '載入賽事失敗');
      }

      const data = await response.json();
      setTournaments(data);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      setSnackbar({
        open: true,
        message: error.message || '載入賽事失敗',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const url = editingTournament
        ? `${config.API_BASE_URL}/api/v1/tournaments/${editingTournament.id}`
        : `${config.API_BASE_URL}/api/v1/tournaments`;
      
      const response = await fetch(url, {
        method: editingTournament ? 'PUT' : 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '操作失敗');
      }

      const data = await response.json();
      setSnackbar({
        open: true,
        message: `賽事${editingTournament ? '更新' : '新增'}成功`,
        severity: 'success'
      });
      
      setOpenDialog(false);
      setEditingTournament(null);
      setFormData({ name: '', date: '' });
      await fetchTournaments();
    } catch (error) {
      console.error('Error saving tournament:', error);
      setSnackbar({
        open: true,
        message: error.message || `賽事${editingTournament ? '更新' : '新增'}失敗`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
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
    if (!window.confirm('確定要刪除這個賽事嗎？')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${config.API_BASE_URL}/api/v1/tournaments/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete tournament');
      }

      setSnackbar({
        open: true,
        message: '賽事刪除成功',
        severity: 'success'
      });
      
      fetchTournaments();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      setSnackbar({
        open: true,
        message: '賽事刪除失敗',
        severity: 'error'
      });
    } finally {
      setLoading(false);
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
                hover
                onClick={() => onTournamentSelect(tournament)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>{tournament.name}</TableCell>
                <TableCell>{tournament.date}</TableCell>
                <TableCell align="right">
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(tournament);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(tournament.id);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>{editingTournament ? '編輯賽事' : '新增賽事'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
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
