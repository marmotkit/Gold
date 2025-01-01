import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  TextField,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  IconButton,
  Typography,
  LinearProgress,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { apiConfig } from '../config';
import debounce from 'lodash.debounce';

// 加入格式化函數
const formatHandicap = (value) => {
  // 特別處理 0、0.0、'0' 等情況
  if (value === 0 || value === '0' || value === 0.0) return '0.00';
  if (value === null || value === undefined || value === '') return '';
  return Number(value).toFixed(2);
};

function ParticipantManagement({ tournament }) {
  const [participants, setParticipants] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [formData, setFormData] = useState({
    registration_number: '',
    member_number: '',
    name: '',
    handicap: '',
    pre_group_code: '',
    tournament_id: ''  // 添加 tournament_id 參數
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [newParticipant, setNewParticipant] = useState({
    member_number: '',
    name: '',
    handicap: '',
    gender: 'M',
    pre_group_code: '',
    notes: ''
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingHandicaps, setEditingHandicaps] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState(null);

  // 載入參賽者列表
  const loadParticipants = async () => {
    try {
      console.log('開始載入參賽者列表...');
      const response = await fetch(
        `${apiConfig.apiUrl}/tournaments/${tournament.id}/participants`
      );
      console.log('收到回應:', response);
      console.log('回應狀態:', response.status);
      console.log('回應標頭:', response.headers);

      if (!response.ok) {
        throw new Error('HTTP error! status: ' + response.status);
      }

      const data = await response.json();
      console.log('參賽者數據:', data);

      // 按照分組號碼和顯示順序排序參賽者
      const sortedParticipants = data.sort((a, b) => {
        // 先按照分組號碼排序
        const groupNumberA = a.group_number || Number.MAX_SAFE_INTEGER;
        const groupNumberB = b.group_number || Number.MAX_SAFE_INTEGER;
        if (groupNumberA !== groupNumberB) {
          return groupNumberA - groupNumberB;
        }
        // 如果分組號碼相同，按照顯示順序排序
        return (a.display_order || 0) - (b.display_order || 0);
      });

      setParticipants(sortedParticipants);
    } catch (error) {
      console.error('載入參賽者列表失敗:', error);
      setSnackbar({
        open: true,
        message: '載入參賽者列表失敗',
        severity: 'error'
      });
    }
  };

  // 當賽事改變時重新載入參賽者
  useEffect(() => {
      loadParticipants();
  }, [tournament]);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleImport = async () => {
    console.log('開始匯入流程');
    console.log('選擇的檔案:', selectedFile?.name);
    console.log('賽事ID:', tournament?.id);

    if (!selectedFile) {
      setSnackbarMessage('請選擇檔案');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    if (!tournament?.id) {
      setSnackbarMessage('請先選擇賽事');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    // 檢查檔案類型
    if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
      console.log('檔案類型不符:', selectedFile.name);
      setSnackbarMessage('請選擇 Excel 檔案 (.xlsx 或 .xls)');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    try {
      setIsImporting(true);
      setImportProgress(10);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const apiUrl = `${apiConfig.apiUrl}/tournaments/${tournament.id}/participants/import`;
      console.log('準備發送請求到:', apiUrl);

      const response = await fetch(apiUrl, {
          method: 'POST',
          body: formData,
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      console.log('收到回應:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('錯誤回應內容:', errorText);
        throw new Error(
          response.status === 405 ? '伺服器不支援此操作' :
          errorText.includes('<!DOCTYPE html>') ? '伺服器回應格式錯誤' :
          `匯入失敗 (${response.status})`
        );
      }

      setImportProgress(50);

      const responseText = await response.text();
      console.log('回應內容:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
        console.log('解析後的回應:', result);
      } catch (e) {
        console.error('JSON 解析錯誤:', e);
        console.log('無法解析的回應內容:', responseText);
        throw new Error(
          responseText.includes('<!DOCTYPE html>') ? 
          '伺服器回應格式錯誤' : 
          `無法解析的回應: ${responseText.substring(0, 100)}...`
        );
      }

      setImportProgress(100);
      setSnackbarMessage(result.message || '匯入成功！');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      console.log('重新載入參賽者列表');
      await loadParticipants();
      
      // 清除檔案選擇
      setSelectedFile(null);
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      console.error('匯入過程發生錯誤:', error);
      setSnackbarMessage(error.message || '匯入失敗，請確認檔案格式是否正確');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const handleDeleteClick = (participant) => {
    // 檢查是否已報到
    if (participant.check_in_status === 'checked_in') {
      setSnackbar({
        open: true,
        message: '已報到的參賽者不能刪除',
        severity: 'error'
      });
      return;
    }
    setParticipantToDelete(participant);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!participantToDelete) return;

    try {
      const response = await fetch(
        `${apiConfig.apiUrl}/tournaments/${tournament.id}/participants/${participantToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('刪除參賽者失敗');
      }

      // 更新本地狀態
      setParticipants(prev => prev.filter(p => p.id !== participantToDelete.id));
      
      setSnackbar({
        open: true,
        message: '參賽者已成功刪除',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting participant:', error);
      setSnackbar({
        open: true,
        message: '刪除參賽者失敗',
        severity: 'error'
      });
    } finally {
      setOpenDeleteDialog(false);
      setParticipantToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setOpenDeleteDialog(false);
    setParticipantToDelete(null);
  };

  const handleSubmit = async () => {
    try {
      const url = `${apiConfig.apiUrl}/participants/${editingParticipant.id}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedParticipant = await response.json();
        setParticipants(prev => 
          prev.map(p => p.id === editingParticipant.id ? updatedParticipant : p)
        );
        setSuccess('參賽者資料已更新');
        setHasUnsavedChanges(true);
        handleClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || '更新失敗');
      }
    } catch (error) {
      console.error('Error updating participant:', error);
      setError('更新失敗');
    }
  };

  const handleSaveAll = async () => {
    if (!tournament?.id) {
      setError('請先選擇賽事');
      return;
    }

    try {
      setIsSaving(true);

      // 格式化參賽者資料
      const formattedParticipants = participants.map(p => ({
        ...p,
        handicap: formatHandicap(p.handicap),
        pre_group_code: p.pre_group_code ? String(parseInt(p.pre_group_code, 10)) : '',
        notes: p.notes || ''
      }));

      console.log('Saving data:', {
        tournament_id: tournament.id,
        participants: formattedParticipants
      });

      const response = await fetch(`${apiConfig.apiUrl}/tournaments/${tournament.id}/participants`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournament_id: tournament.id,
          participants: formattedParticipants
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '儲存失敗');
      }

      setHasUnsavedChanges(false);
      setSnackbarMessage('儲存成功');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error saving participants:', error);
      setSnackbarMessage(`儲存敗：${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEditingParticipant(null);
    setFormData({
      registration_number: '',
      member_number: '',
      name: '',
      handicap: '',
      pre_group_code: '',
      tournament_id: ''  // 添加 tournament_id 參數
    });
  };

  const handleAddClick = async () => {
    if (!tournament?.id) {
      setError('請先選擇賽事');
      return;
    }

    try {
      // 獲取下一個報名序號
      const response = await fetch(
        `${apiConfig.apiUrl}/tournaments/${tournament.id}/next-registration-number`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '獲取報名序號失敗');
      }

      const data = await response.json();
      
      setNewParticipant({
        tournament_id: tournament.id,
        registration_number: data.next_registration_number,
        member_number: '',
        name: '',
        handicap: '',
        pre_group_code: '',
        notes: ''
      });
      
      setOpenDialog(true);
    } catch (error) {
      console.error('Error getting next registration number:', error);
      setSnackbarMessage(`獲取報名序號失敗：${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleAddParticipant = async () => {
    if (!newParticipant.name) {
      setSnackbar({
        open: true,
        message: '請輸入姓名',
        severity: 'error'
      });
      return;
    }

    try {
      // 先獲取當前最大報名序號
      const maxRegNum = participants.reduce((max, p) => {
        const num = parseInt(p.registration_number.substring(1));
        return num > max ? num : max;
      }, 0);
      
      // 設置新的報名序號
      const newRegNum = `A${String(maxRegNum + 1).padStart(2, '0')}`;
      
      const response = await fetch(`${apiConfig.apiUrl}/tournaments/${tournament.id}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newParticipant,
          registration_number: newRegNum
        }),
      });

      if (!response.ok) {
        throw new Error('新增參賽者失敗');
      }

      const result = await response.json();
      
      // 更新參賽者列表
      setParticipants(prev => [...prev, result.participant]);
      
      // 重置表單並關閉對話框
      setNewParticipant({
        member_number: '',
        name: '',
        handicap: '',
        gender: 'M',
        pre_group_code: '',
        notes: ''
      });
      setOpenDialog(false);
      
      setSnackbar({
        open: true,
        message: '新增參賽者成功',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error adding participant:', error);
      setSnackbar({
        open: true,
        message: error.message || '新增失敗',
        severity: 'error'
      });
    }
  };

  const handleNotesChange = async (participantId, newNotes) => {
    try {
      const response = await fetch(
        `${apiConfig.apiUrl}/tournaments/${tournament.id}/participants/${participantId}/notes`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ notes: newNotes }),
        }
      );

      if (!response.ok) {
        throw new Error('備註更新失敗');
      }

      // 更新本地狀態
      setParticipants(prev =>
        prev.map(p =>
          p.id === participantId ? { ...p, notes: newNotes } : p
        )
      );
    } catch (error) {
      console.error('備註更新失敗:', error);
      setSnackbar({
        open: true,
        message: '備註更新失敗',
        severity: 'error'
      });
    }
  };

  const debouncedNotesChange = useCallback(
    debounce((participantId, newNotes) => {
      handleNotesChange(participantId, newNotes);
    }, 500),
    [tournament?.id] // 依賴項
  );

  useEffect(() => {
    return () => {
      debouncedNotesChange.cancel();
    };
  }, [debouncedNotesChange]);

  const handleHandicapChange = (participantId, value) => {
    setEditingHandicaps(prev => ({
      ...prev,
      [participantId]: value
    }));
  };

  const handleSaveHandicap = async (participant) => {
    try {
      const newHandicap = editingHandicaps[participant.id];
      if (newHandicap === undefined || newHandicap === participant.handicap) {
        return;
      }

      const response = await fetch(`${apiConfig.apiUrl}/participants/${participant.id}/handicap`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ handicap: newHandicap }),
      });

      if (!response.ok) {
        throw new Error('更新差點失敗');
      }

      // 更新本地狀態
      setParticipants(prevParticipants =>
        prevParticipants.map(p =>
          p.id === participant.id ? { ...p, handicap: newHandicap } : p
        )
      );

      // 清除輯狀態
      setEditingHandicaps(prev => {
        const newState = { ...prev };
        delete newState[participant.id];
        return newState;
      });

      setSnackbar({
        open: true,
        message: '差點更新成功',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating handicap:', error);
      setSnackbar({
        open: true,
        message: error.message || '更新失敗',
        severity: 'error'
      });
    }
  };

  const handleParticipantChange = (index, field, value) => {
    setParticipants(prevParticipants => 
      prevParticipants.map((p, i) => 
        i === index ? { ...p, [field]: value } : p
      )
    );
    setHasUnsavedChanges(true);
  };

  const handleFileUpload = async (file) => {
    if (!file || !tournament) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsImporting(true);
      console.log('開始匯入流程');
      console.log('選擇的檔案:', file.name);
      console.log('賽事ID:', tournament.id);

      // 修改 API 路徑，加入 /api/v1/
      const apiUrl = `${apiConfig.apiUrl}/tournaments/${tournament.id}/participants/import`;
      console.log('準備發送請求到:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      });

      console.log('收到回應:', response);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('匯入失敗:', errorData);
        setSnackbarMessage(errorData.error || '匯入失敗');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }

      const result = await response.json();
      console.log('回應內容:', JSON.stringify(result));
      console.log('解析後的回應:', result);

      // 顯示結果訊息
      const message = `${result.message}\n${result.error_count > 0 ? 
        `發生 ${result.error_count} 個錯誤:\n${result.errors.join('\n')}` : ''}`;
      setSnackbarMessage(message);
      setSnackbarSeverity(result.error_count > 0 ? 'warning' : 'success');
      setSnackbarOpen(true);

      // 重新載入參賽者列表
      console.log('重新載入參賽者列表');
      await loadParticipants();
    } catch (error) {
      console.error('匯入過程發生錯誤:', error);
      setSnackbarMessage('匯入過程發生錯誤');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsImporting(false);
    }
  };

  const handleOpenDialog = async () => {
    try {
      // 獲取下一個報名序號
      const response = await fetch(`${apiConfig.apiUrl}/tournaments/${tournament.id}/next-registration-number`);
      if (!response.ok) {
        throw new Error('獲取報名序號失敗');
      }
      const data = await response.json();
      console.log('獲取到的報名序號數據:', data);  // 添加日誌
      
      // 設置初始值，包含自動生成的報名序號
      setNewParticipant({
        registration_number: data.next_number,  // 修正鍵名
        member_number: '',
        name: '',
        handicap: '',
        gender: 'M',
        pre_group_code: '',
        notes: ''
      });
      setOpenDialog(true);
    } catch (error) {
      console.error('Error:', error);
      setSnackbar({
        open: true,
        message: '獲取報名序號失敗',
        severity: 'error'
      });
    }
  };

  // 添加事件監聽器
  useEffect(() => {
    // 監聽備註更新事件
    const handleNotesUpdate = (event) => {
      const { participantId, notes } = event.detail;
      setParticipants(prev =>
        prev.map(p =>
          p.id === participantId ? { ...p, notes } : p
        )
      );
    };

    window.addEventListener('notesUpdated', handleNotesUpdate);

    return () => {
      window.removeEventListener('notesUpdated', handleNotesUpdate);
    };
  }, []);

  // 添加重新載入函數
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

  // 添加頁面點事件監聽
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

  // 切換報到狀態
  const handleToggleCheckIn = async (participant) => {
    try {
      const newStatus = participant.check_in_status === 'checked_in' ? 'not_checked_in' : 'checked_in';
      const response = await fetch(
        `${apiConfig.apiUrl}/participants/${participant.id}/check-in`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            check_in_status: newStatus,
            check_in_time: newStatus === 'checked_in' ? new Date().toISOString() : null
          })
        }
      );

      if (!response.ok) {
        throw new Error('更新報到狀態失敗');
      }

      // 更新本地狀態
      setParticipants(prevParticipants =>
        prevParticipants.map(p =>
          p.id === participant.id
            ? {
                ...p,
                check_in_status: newStatus,
                check_in_time: newStatus === 'checked_in' ? new Date().toISOString() : null,
                checked_in: newStatus === 'checked_in'
              }
            : p
        )
      );

      setSnackbar({
        open: true,
        message: newStatus === 'checked_in' ? '報到成功' : '取消報到成功',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error toggling check-in:', error);
      setSnackbar({
        open: true,
        message: '更新報到狀態失敗',
        severity: 'error'
      });
    }
  };

  // 渲染分組標題
  const renderGroupTitle = (participant, index, participants) => {
    // 如果是第一個參賽者，或者前一個參賽者的分組不同，則顯示分組標題
    if (index === 0 || participants[index - 1].group_number !== participant.group_number) {
      const groupNumber = participant.group_number;
      const groupCount = participants.filter(p => p.group_number === groupNumber).length;
      return (
        <Box sx={{ 
          backgroundColor: '#f5f5f5', 
          p: 1, 
          mb: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6">
            {groupNumber ? `第 ${groupNumber} 組` : '未分組'}
          </Typography>
          <Typography variant="subtitle1">
            {`${groupCount} 人`}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  // 渲染參賽者列表
  const renderParticipantList = () => {
    if (!participants.length) {
      return (
        <Typography variant="body1" sx={{ textAlign: 'center', py: 2 }}>
          尚無參賽者
        </Typography>
      );
    }

    return participants.map((participant, index) => (
      <React.Fragment key={participant.id}>
        {renderGroupTitle(participant, index, participants)}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1,
          mb: 0.5,
          backgroundColor: participant.checked_in ? '#e8f5e9' : 'white',
          borderRadius: 1,
          '&:hover': {
            backgroundColor: participant.checked_in ? '#c8e6c9' : '#f5f5f5',
          }
        }}>
          <Box sx={{ flex: 1 }}>
            <Typography>
              {participant.name}
              {participant.gender === 'M' ? ' 🚹' : ' 🚺'}
              {participant.handicap && ` (${participant.handicap})`}
            </Typography>
          </Box>
          <Box>
            <Button
              variant={participant.checked_in ? "contained" : "outlined"}
              color={participant.checked_in ? "success" : "primary"}
              onClick={() => handleToggleCheckIn(participant)}
              sx={{ mr: 1 }}
            >
              {participant.checked_in ? '已報到' : '報到'}
            </Button>
          </Box>
        </Box>
      </React.Fragment>
    ));
  };

  return (
    <Box component="section" role="region" aria-label="參賽者管理">
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          參賽者管理
        </Typography>
        {tournament ? (
          <>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button
                component="span"
                variant="contained"
                color="primary"
                startIcon={<UploadFileIcon />}
                sx={{ mr: 1 }}
              >
                選擇檔案
              </Button>
            </label>
            <Button
              variant="contained"
              onClick={() => handleFileUpload(selectedFile)}
              disabled={!selectedFile || isImporting}
              startIcon={<UploadFileIcon />}
              sx={{ mr: 1 }}
            >
              匯入
            </Button>
            <Button
              variant="contained"
              onClick={handleOpenDialog}
              startIcon={<AddCircleIcon />}
              disabled={!tournament}
            >
              新增參賽者
            </Button>
            {selectedFile && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                已選擇檔案: {selectedFile.name}
              </Typography>
            )}
          </>
        ) : (
          <Typography color="text.secondary">
            請先選擇賽事
          </Typography>
        )}
      </Box>

      {isImporting && (
        <Box sx={{ width: '100%', mb: 2 }}>
          <LinearProgress variant="determinate" value={importProgress} />
        </Box>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 120 }}>報名序號</TableCell>
              <TableCell sx={{ width: 100 }}>會員編號</TableCell>
              <TableCell sx={{ width: 120 }}>姓名</TableCell>
              <TableCell sx={{ width: 80 }}>差點</TableCell>
              <TableCell sx={{ width: 100 }}>性別</TableCell>
              <TableCell sx={{ width: 100 }}>預分組編號</TableCell>
              <TableCell sx={{ width: 80 }}>報到狀態</TableCell>
              <TableCell sx={{ width: 200 }}>備註</TableCell>
              <TableCell sx={{ width: 100 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {participants.map((participant) => (
              <TableRow key={participant.id}>
                <TableCell>{participant.registration_number}</TableCell>
                <TableCell>{participant.member_number}</TableCell>
                <TableCell>{participant.name}</TableCell>
                <TableCell>
                  {participant.handicap === null || participant.handicap === undefined || participant.handicap === '' 
                    ? ''
                    : participant.handicap
                  }
                </TableCell>
                <TableCell>{participant.gender === 'M' ? '男' : '女'}</TableCell>
                <TableCell>{participant.pre_group_code}</TableCell>
                <TableCell>
                  {participant.check_in_status === 'checked_in' ? (
                    <Chip label="已報到" color="success" size="small" />
                  ) : (
                    <Chip label="未報到" color="default" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <TextField
                    value={participant.notes || ''}
                    onChange={(e) => {
                      const newNotes = e.target.value;
                      // 立即更新本地狀態以提供即時反饋
                      setParticipants(prev =>
                        prev.map(p =>
                          p.id === participant.id ? { ...p, notes: newNotes } : p
                        )
                      );
                      // 使用 debounce 函數延遲發送到服務器
                      debouncedNotesChange(participant.id, newNotes);
                    }}
                    placeholder="備註"
                    variant="standard"
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleDeleteClick(participant)}
                    color="error"
                    size="small"
                    disabled={participant.check_in_status === 'checked_in'}
                    sx={{
                      opacity: participant.check_in_status === 'checked_in' ? 0.5 : 1
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

      <Dialog
        open={openDeleteDialog}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          確認刪除
        </DialogTitle>
        <DialogContent>
          <Typography id="delete-dialog-description">
            確定要刪除參賽者 {participantToDelete?.name} 嗎？此操作無法復原。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            取消
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            刪除
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>新增參賽者</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: 'block' }}>
              報名序號 (自動產生)
            </Typography>
            <TextField
              fullWidth
              value={newParticipant.registration_number || ''}
              disabled
              InputProps={{
                readOnly: true,
                sx: {
                  bgcolor: 'action.hover',
                  '& .MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                    color: 'rgba(0, 0, 0, 0.87)'
                  }
                }
              }}
            />
          </Box>
          <TextField
            margin="dense"
            label="會員編號"
            fullWidth
            value={newParticipant.member_number}
            onChange={(e) => setNewParticipant(prev => ({
              ...prev,
              member_number: e.target.value
            }))}
          />
          <TextField
            margin="dense"
            label="姓名"
            fullWidth
            required
            value={newParticipant.name}
            onChange={(e) => setNewParticipant(prev => ({
              ...prev,
              name: e.target.value
            }))}
          />
          <TextField
            margin="dense"
            label="差點"
            fullWidth
            value={newParticipant.handicap}
            onChange={(e) => setNewParticipant(prev => ({
              ...prev,
              handicap: e.target.value
            }))}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>性別</InputLabel>
            <Select
              value={newParticipant.gender}
              onChange={(e) => setNewParticipant(prev => ({
                ...prev,
                gender: e.target.value
              }))}
            >
              <MenuItem value="M">男</MenuItem>
              <MenuItem value="F">女</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="預分組編號"
            fullWidth
            value={newParticipant.pre_group_code}
            onChange={(e) => setNewParticipant(prev => ({
              ...prev,
              pre_group_code: e.target.value
            }))}
          />
          <TextField
            margin="dense"
            label="備註"
            fullWidth
            multiline
            rows={2}
            value={newParticipant.notes}
            onChange={(e) => setNewParticipant(prev => ({
              ...prev,
              notes: e.target.value
            }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button onClick={handleAddParticipant} variant="contained">
            新增
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ParticipantManagement;
