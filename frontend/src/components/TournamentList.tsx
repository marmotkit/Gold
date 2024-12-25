import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
} from '@mui/material';
import axios from 'axios';
import './TournamentList.css';

interface Tournament {
  id: number;
  name: string;
  date: string;
}

export default function TournamentList() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/v1/tournaments');
      setTournaments(response.data);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const handleAddTournament = async () => {
    try {
      await axios.post('http://localhost:5000/api/v1/tournaments', {
        name: '新賽事',
        date: '2024-03-16'
      });
      fetchTournaments();
    } catch (error) {
      console.error('Error adding tournament:', error);
    }
  };

  const handleNavigate = useCallback((path: string, event: React.MouseEvent) => {
    event.stopPropagation();
    navigate(path);
  }, [navigate]);

  return (
    <div>
      <div className="tournament-header">
        <Typography variant="h5">賽事列表</Typography>
        <Button variant="contained" color="primary" onClick={handleAddTournament}>
          新增賽事
        </Button>
      </div>

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
            {tournaments.map(tournament => (
              <TableRow 
                key={tournament.id}
                onClick={(e) => {
                  // 阻止事件冒泡
                  e.stopPropagation();
                  // 如果點擊的是按鈕，不處理選擇
                  if ((e.target as HTMLElement).closest('button')) {
                    return;
                  }
                  console.log('Row clicked, current:', selectedId, 'clicking:', tournament.id);
                  setSelectedId(tournament.id === selectedId ? null : tournament.id);
                }}
                style={{
                  cursor: 'pointer',
                  backgroundColor: tournament.id === selectedId ? '#e3f2fd' : 'transparent'
                }}
              >
                <TableCell>{tournament.name}</TableCell>
                <TableCell>{new Date(tournament.date).toLocaleDateString()}</TableCell>
                <TableCell align="right">
                  {tournament.id === selectedId && (
                    <div className="actions-container">
                      <Button
                        variant="outlined"
                        onClick={(e) => handleNavigate(`/import/${tournament.id}`, e)}
                      >
                        匯入名單
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={(e) => handleNavigate(`/participants/${tournament.id}`, e)}
                      >
                        參賽者管理
                      </Button>
                      <Button
                        variant="contained"
                        onClick={(e) => handleNavigate(`/checkin/${tournament.id}`, e)}
                      >
                        報到管理
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
