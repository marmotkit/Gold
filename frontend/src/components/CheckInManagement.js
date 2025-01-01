import React, { useState, useEffect, useCallback } from 'react';
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
  CircularProgress,
  TextField,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { apiConfig } from '../config';
import { debounce } from 'lodash';

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
      const response = await fetch(`${apiConfig.apiUrl}/tournaments/${tournament.id}/participants`);
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
  const handleCheckIn = async (participant) => {
    try {
      const response = await fetch(
        `${apiConfig.apiUrl}/tournaments/${tournament.id}/participants/${participant.id}/check-in`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            check_in_status: participant.check_in_status === 'checked_in' ? 'not_checked_in' : 'checked_in',
            check_in_time: participant.check_in_status === 'checked_in' ? null : new Date().toISOString()
          }),
        }
      );

      if (!response.ok) {
        throw new Error('報到失敗');
      }

      const data = await response.json();
      // 更新本地狀態
      setParticipants(prev =>
        prev.map(p =>
          p.id === participant.id
            ? {
                ...p,
                check_in_status: data.participant.check_in_status,
                check_in_time: data.participant.check_in_time
              }
            : p
        )
      );

      setSnackbar({
        open: true,
        message: data.message,
        severity: 'success'
      });

    } catch (error) {
      console.error('Error checking in:', error);
      setSnackbar({
        open: true,
        message: '報到操作失敗',
        severity: 'error'
      });
    }
  };

  // 處理取消報到
  const handleCancelCheckIn = async (participant) => {
    try {
      const response = await fetch(
        `${apiConfig.apiUrl}/tournaments/${tournament.id}/participants/${participant.id}/check-in`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            check_in_status: 'not_checked_in',
            check_in_time: null
          }),
        }
      );

      if (!response.ok) {
        throw new Error('取消報到失敗');
      }

      const data = await response.json();
      // 更新本地狀態
      setParticipants(prev =>
        prev.map(p =>
          p.id === participant.id
            ? {
                ...p,
                check_in_status: data.participant.check_in_status,
                check_in_time: data.participant.check_in_time
              }
            : p
        )
      );

      setSnackbar({
        open: true,
        message: '已取消報到',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error canceling check-in:', error);
      setSnackbar({
        open: true,
        message: '取消���到失敗',
        severity: 'error'
      });
    }
  };

  // 修改 handleNotesChange 函數
  const handleNotesChange = async (participantId, notes) => {
    try {
      const response = await fetch(
        `${apiConfig.apiUrl}/tournaments/${tournament.id}/participants/${participantId}/notes`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ notes }),
        }
      );

      if (!response.ok) {
        throw new Error('備註更新失敗');
      }

      const data = await response.json();
      
      // 更新本地狀態
      setParticipants(prev =>
        prev.map(p =>
          p.id === participantId ? { ...p, notes: data.participant.notes } : p
        )
      );

      // 發送事件通知其他組件
      window.dispatchEvent(new CustomEvent('notesUpdated', {
        detail: { participantId, notes: data.participant.notes }
      }));

    } catch (error) {
      console.error('Error updating notes:', error);
      setSnackbar({
        open: true,
        message: '備註更新失敗',
        severity: 'error'
      });
    }
  };

  // 修改事件監聽器
  useEffect(() => {
    const handleNotesUpdate = (event) => {
      const { participantId, notes } = event.detail;
      setParticipants(prev =>
        prev.map(p =>
          p.id === participantId ? { ...p, notes } : p
        )
      );
    };

    window.addEventListener('notesUpdated', handleNotesUpdate);

    // 清理函數
    return () => {
      window.removeEventListener('notesUpdated', handleNotesUpdate);
    };
  }, []);

  // 添加排序函數
  const sortByHandicap = (participants) => {
    return [...participants].sort((a, b) => {
      const handicapA = parseFloat(a.handicap) || 999;
      const handicapB = parseFloat(b.handicap) || 999;
      return handicapA - handicapB;
    });
  };

  // 修改 groupedParticipants 的處理
  const groupedParticipants = participants.reduce((acc, participant) => {
    const groupCode = participant.group_code || 'None';
    if (!acc[groupCode]) {
      acc[groupCode] = [];
    }
    acc[groupCode].push(participant);
    return acc;
  }, {});

  // 對每個組內的參賽者按照 display_order 排序
  Object.keys(groupedParticipants).forEach(groupCode => {
    groupedParticipants[groupCode].sort((a, b) => {
      // 如果 display_order 相同，則按照報名序號排序
      if (a.display_order === b.display_order) {
        return a.registration_number.localeCompare(b.registration_number);
      }
      return a.display_order - b.display_order;
    });
  });

  // 計算每組人數
  const groupCounts = Object.keys(groupedParticipants).reduce((acc, groupCode) => {
    acc[groupCode] = groupedParticipants[groupCode].length;
    return acc;
  }, {});

  // 按分組排序
  const sortedGroups = Object.keys(groupedParticipants).sort((a, b) => {
    if (a === 'None') return 1;
    if (b === 'None') return -1;
    
    // 從分組代碼中提取數字
    const getGroupNumber = (code) => {
      const match = code.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    };
    
    // 按數字大小排序
    return getGroupNumber(a) - getGroupNumber(b);
  });

  // 渲染表格行
  const renderTableRow = (participant) => (
    <TableRow key={participant.id}>
      <TableCell>{participant.registration_number}</TableCell>
      <TableCell>{participant.member_number}</TableCell>
      <TableCell>{participant.name}</TableCell>
      <TableCell>{participant.handicap}</TableCell>
      <TableCell>{participant.group_code || '未分組'}</TableCell>
      <TableCell>
        {participant.check_in_status === 'checked_in' ? (
          <Chip label="已報到" color="success" />
        ) : (
          <Chip label="未報到" color="default" />
        )}
      </TableCell>
      <TableCell>
        <Button
          variant="contained"
          color={participant.check_in_status === 'checked_in' ? "warning" : "primary"}
          onClick={() => participant.check_in_status === 'checked_in' 
            ? handleCancelCheckIn(participant) 
            : handleCheckIn(participant)}
          disabled={loading}
        >
          {participant.check_in_status === 'checked_in' ? "取消報到" : "報到"}
        </Button>
      </TableCell>
      <TableCell>
        <TextField
          value={participant.notes || ''}
          onChange={(e) => debouncedNotesChange(participant.id, e.target.value)}
          placeholder="備註"
          variant="standard"
          fullWidth
        />
      </TableCell>
    </TableRow>
  );

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // 修改 debounce 的實現
  const debouncedNotesChange = useCallback(
    debounce((participantId, notes) => {
      handleNotesChange(participantId, notes);
    }, 1000),  // 增加延遲時間到 1 秒
    [tournament?.id] // 添加依賴
  );

  // 修改 reloadParticipants 函數
  const reloadParticipants = useCallback(async () => {
    try {
      const response = await fetch(`${apiConfig.apiUrl}/tournaments/${tournament.id}/participants`);
      if (!response.ok) {
        throw new Error('無法獲取參賽者列表');
      }
      const data = await response.json();
      // 保留現有的備註
      setParticipants(prev => {
        const notesMap = new Map(prev.map(p => [p.id, p.notes]));
        return data.map(p => ({
          ...p,
          notes: notesMap.get(p.id) || p.notes || ''
        }));
      });
    } catch (error) {
      console.error('Error reloading participants:', error);
    }
  }, [tournament?.id]);

  // 添加頁面焦點事件監聽
  useEffect(() => {
    const handleFocus = () => {
      if (tournament?.id) {
        reloadParticipants();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [reloadParticipants, tournament?.id]);

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
                    <TableCell>會員編號</TableCell>
                    <TableCell>姓名</TableCell>
                    <TableCell>差點</TableCell>
                    <TableCell>分組</TableCell>
                    <TableCell>報到狀態</TableCell>
                    <TableCell>操作</TableCell>
                    <TableCell>備註</TableCell>
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
