import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Container,
  CircularProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import config from '../config';

function CheckInManagement({ tournament }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    if (tournament) {
      fetchParticipants();
    }
  }, [tournament]);

  const fetchParticipants = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/v1/tournaments/${tournament.id}/check-ins`);
      if (!response.ok) {
        throw new Error('無法獲取參賽者列表');
      }
      const data = await response.json();
      setParticipants(data);
    } catch (error) {
      console.error('Error fetching participants:', error);
      setSnackbar({
        open: true,
        message: '無法獲取參賽者列表',
        severity: 'error'
      });
    }
  };

  // 處理報到
  const handleCheckIn = async (participantId) => {
    try {
      setLoading(true);
      const response = await fetch(`${config.API_BASE_URL}/api/v1/participants/${participantId}/check-in`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('報到失敗');
      }

      // 重新獲取參賽者列表
      await fetchParticipants();

      setSnackbar({
        open: true,
        message: '報到成功',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error checking in:', error);
      setSnackbar({
        open: true,
        message: error.message || '報到失敗',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // 處理取消報到
  const handleCancelCheckIn = async (participantId) => {
    try {
      setLoading(true);
      const response = await fetch(`${config.API_BASE_URL}/api/v1/participants/${participantId}/cancel-check-in`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('取消報到失敗');
      }

      // 重新獲取參賽者列表
      await fetchParticipants();

      setSnackbar({
        open: true,
        message: '已取消報到',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error canceling check-in:', error);
      setSnackbar({
        open: true,
        message: error.message || '取消報到失敗',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // 按分組整理參賽者
  const groupedParticipants = participants.reduce((acc, participant) => {
    const groupCode = participant.group_code || 'None';
    if (!acc[groupCode]) {
      acc[groupCode] = [];
    }
    acc[groupCode].push(participant);
    return acc;
  }, {});

  // 計算每組人數
  const groupCounts = Object.keys(groupedParticipants).reduce((acc, groupCode) => {
    acc[groupCode] = groupedParticipants[groupCode].length;
    return acc;
  }, {});

  // 對每組內的參賽者按差點排序
  Object.keys(groupedParticipants).forEach(groupCode => {
    groupedParticipants[groupCode].sort((a, b) => {
      const handicapA = parseFloat(a.handicap) || 0;
      const handicapB = parseFloat(b.handicap) || 0;
      return handicapA - handicapB;
    });
  });

  // 按分組排序
  const sortedGroups = Object.keys(groupedParticipants).sort((a, b) => {
    if (a === 'None') return 1;
    if (b === 'None') return -1;
    return a.localeCompare(b);
  });

  // 渲染表格行
  const renderTableRow = (participant) => (
    <TableRow key={participant.id}>
      <TableCell>{participant.registration_number}</TableCell>
      <TableCell>{participant.name}</TableCell>
      <TableCell>{participant.member_number}</TableCell>
      <TableCell>{participant.handicap}</TableCell>
      <TableCell>{participant.check_in_status === 'checked_in' ? '已報到' : '未報到'}</TableCell>
      <TableCell>
        {participant.check_in_time ? new Date(participant.check_in_time).toLocaleString('zh-TW') : '-'}
      </TableCell>
      <TableCell>
        {participant.check_in_status === 'checked_in' ? (
          <Button
            variant="contained"
            color="secondary"
            onClick={() => handleCancelCheckIn(participant.id)}
            disabled={loading}
          >
            取消報到
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleCheckIn(participant.id)}
            disabled={loading}
          >
            報到
          </Button>
        )}
      </TableCell>
    </TableRow>
  );

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (!tournament) {
    return (
      <Typography variant="h6" sx={{ textAlign: 'center', mt: 2 }}>
        請先選擇賽事
      </Typography>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6">報到管理</Typography>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {sortedGroups.map(groupCode => (
        <Accordion key={groupCode} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>
              {groupCode === 'None' ? 'None' : groupCode} 組 ({groupCounts[groupCode]} 人)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>報名序號</TableCell>
                    <TableCell>姓名</TableCell>
                    <TableCell>會員編號</TableCell>
                    <TableCell>差點</TableCell>
                    <TableCell>報到狀態</TableCell>
                    <TableCell>報到時間</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupedParticipants[groupCode].map((participant) => renderTableRow(participant))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ))}
    </Container>
  );
}

export default CheckInManagement;
