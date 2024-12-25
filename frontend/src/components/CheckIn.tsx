import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Snackbar,
  Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import config from '../config';

interface Participant {
  id: number;
  registration_number: string;
  member_number: string;
  name: string;
  group_number: string;
  check_in_status: string;
  check_in_time: string | null;
}

interface Group {
  group_number: string;
  participants: Participant[];
}

const CheckIn = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    if (tournamentId) {
      fetchGroups();
    }
  }, [tournamentId]);

  const fetchGroups = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/v1/tournaments/${tournamentId}/groups`);
      if (!response.ok) {
        throw new Error('載入分組資料失敗');
      }
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('載入分組資料失敗');
    }
  };

  const handleCheckIn = async (participantId: number) => {
    try {
      const response = await fetch(
        `${config.API_BASE_URL}/api/v1/participants/${participantId}/check-in`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('報到失敗');
      }

      setSuccess('報到成功');
      fetchGroups();
    } catch (error) {
      console.error('Error checking in participant:', error);
      setError('報到失敗');
    }
  };

  const handleCancelCheckIn = async (participantId: number) => {
    try {
      const response = await fetch(
        `${config.API_BASE_URL}/api/v1/participants/${participantId}/cancel-check-in`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('取消報到失敗');
      }

      setSuccess('已取消報到');
      fetchGroups();
    } catch (error) {
      console.error('Error cancelling check-in:', error);
      setError('取消報到失敗');
    }
  };

  const getStatusColor = (status: string): "success" | "error" | "default" => {
    switch (status) {
      case 'checked_in':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'checked_in':
        return '已報到';
      case 'cancelled':
        return '已取消';
      default:
        return '未報到';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>報到管理</Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>組別</TableCell>
              <TableCell>報名序號</TableCell>
              <TableCell>會員編號</TableCell>
              <TableCell>姓名</TableCell>
              <TableCell>狀態</TableCell>
              <TableCell>報到時間</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map((group) => (
              group.participants.map((participant, index) => (
                <TableRow key={participant.id}>
                  {index === 0 && (
                    <TableCell rowSpan={group.participants.length}>
                      {group.group_number}
                    </TableCell>
                  )}
                  <TableCell>{participant.registration_number}</TableCell>
                  <TableCell>{participant.member_number}</TableCell>
                  <TableCell>{participant.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusText(participant.check_in_status)}
                      color={getStatusColor(participant.check_in_status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {participant.check_in_time ? new Date(participant.check_in_time).toLocaleString() : '-'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="success"
                      onClick={() => handleCheckIn(participant.id)}
                      disabled={participant.check_in_status === 'checked_in'}
                    >
                      <CheckCircleIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleCancelCheckIn(participant.id)}
                      disabled={participant.check_in_status === 'cancelled'}
                    >
                      <CancelIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CheckIn;
