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
  Box
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import config from '../config';
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
    registration_number: '',
    member_number: '',
    name: '',
    handicap: '',
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

  const loadParticipants = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/v1/tournaments/${tournament.id}/participants`);
      if (response.ok) {
        const data = await response.json();
        setParticipants(data);
        setHasUnsavedChanges(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '載入參賽者列表失敗');
      }
    } catch (error) {
      console.error('Error loading participants:', error);
      setError('載入參賽者列表失敗');
    }
  };

  useEffect(() => {
    if (tournament?.id) {
      loadParticipants();
    }
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

      const apiUrl = `${config.API_BASE_URL}/tournaments/${tournament.id}/participants/import`;
      console.log('準備發送請求到:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include',
        mode: 'cors'
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

  const handleDeleteClick = async (participantId) => {
    try {
      const response = await fetch(
        `${config.API_BASE_URL}/api/participants/${participantId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // 更新本地狀態，移除被刪除的參賽者
        setParticipants(participants.filter(p => p.id !== participantId));
        setSuccess(data.message);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '刪除參賽者失敗');
      }
    } catch (error) {
      console.error('Error deleting participant:', error);
      setError('刪除參賽者失敗');
    }
  };

  const handleSubmit = async () => {
    try {
      const url = `${config.API_BASE_URL}/api/participants/${editingParticipant.id}`;
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

      const response = await fetch(`${config.API_BASE_URL}/api/v1/tournaments/${tournament.id}/participants`, {
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
      setSnackbarMessage(`儲存失敗：${error.message}`);
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
        `${config.API_BASE_URL}/api/v1/tournaments/${tournament.id}/next-registration-number`
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
    if (!tournament?.id) {
      setError('請先選擇賽事');
      return;
    }

    if (!newParticipant.name) {
      setError('請輸入姓名');
      return;
    }

    try {
      const response = await fetch(`${config.API_BASE_URL}/api/v1/tournaments/${tournament.id}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newParticipant,
          tournament_id: tournament.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '新增參賽者失敗');
      }

      setSnackbarMessage('新增參賽者成功');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setOpenDialog(false);
      loadParticipants();  // 重新載入參賽者列表
    } catch (error) {
      console.error('Error adding participant:', error);
      setSnackbarMessage(`新增參賽者失敗：${error.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleNotesChange = async (participantId, notes) => {
    try {
      setLoading(true);
      const response = await fetch(`${config.API_BASE_URL}/api/v1/participants/${participantId}/notes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notes');
      }

      // 更新本地狀態
      setParticipants(prevParticipants =>
        prevParticipants.map(p =>
          p.id === participantId ? { ...p, notes } : p
        )
      );

      setSuccess('備註更新成功');
    } catch (error) {
      console.error('Error updating notes:', error);
      setError('備註更新失敗');
    } finally {
      setLoading(false);
    }
  };

  const debouncedNotesChange = useCallback(
    debounce((participantId, notes) => {
      handleNotesChange(participantId, notes);
    }, 500),
    []
  );

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

      const response = await fetch(`${config.API_BASE_URL}/api/v1/participants/${participant.id}/handicap`, {
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

      // 清除編輯狀態
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

  return (
    <div>
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item>
            <input
              type="file"
              accept=".xlsx"
              style={{ display: 'none' }}
              id="file-input"
              onChange={handleFileChange}
            />
            <label htmlFor="file-input">
              <Button
                variant="contained"
                component="span"
                startIcon={<UploadFileIcon />}
                sx={{ mr: 1 }}
              >
                選擇檔案
              </Button>
            </label>
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={!selectedFile || isImporting}
              startIcon={<UploadFileIcon />}
              sx={{ mr: 1 }}
            >
              匯入名單
            </Button>
            <Button
              variant="contained"
              onClick={handleAddClick}
              startIcon={<AddCircleIcon />}
              color="primary"
            >
              新增參賽者
            </Button>
          </Grid>
        </Grid>
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
              <TableCell>報名序號</TableCell>
              <TableCell>會員編號</TableCell>
              <TableCell>姓名</TableCell>
              <TableCell>差點</TableCell>
              <TableCell>預分組編號</TableCell>
              <TableCell>分組</TableCell>
              <TableCell>備註</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {participants.map((participant, index) => (
              <TableRow key={participant.id || index}>
                <TableCell>{participant.registration_number}</TableCell>
                <TableCell>{participant.member_number}</TableCell>
                <TableCell>{participant.name}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <TextField
                      size="small"
                      value={editingHandicaps[participant.id] ?? participant.handicap}
                      onChange={(e) => handleHandicapChange(participant.id, e.target.value)}
                      sx={{ width: '80px' }}
                    />
                    {editingHandicaps[participant.id] !== undefined && 
                      editingHandicaps[participant.id] !== participant.handicap && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleSaveHandicap(participant)}
                        sx={{ minWidth: 'unset', px: 1 }}
                      >
                        儲存
                      </Button>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{participant.pre_group_code || ''}</TableCell>
                <TableCell>{participant.group_code || ''}</TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={participant.notes || ''}
                    onChange={(e) => handleNotesChange(participant.id, e.target.value)}
                    placeholder="備註"
                    variant="standard"
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleDeleteClick(participant.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 新增/編輯參賽者對話框 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>{editingParticipant ? '編輯參賽者' : '新增參賽者'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="報名序號"
                value={newParticipant.registration_number || ''}
                disabled
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="會員編號"
                value={newParticipant.member_number || ''}
                onChange={(e) => setNewParticipant({ ...newParticipant, member_number: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="姓名"
                value={newParticipant.name || ''}
                onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="差點"
                value={newParticipant.handicap || ''}
                onChange={(e) => setNewParticipant({ ...newParticipant, handicap: e.target.value })}
                fullWidth
                type="number"
                inputProps={{ step: 0.1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="預分組編號"
                value={newParticipant.pre_group_code || ''}
                onChange={(e) => setNewParticipant({ ...newParticipant, pre_group_code: e.target.value })}
                fullWidth
                type="number"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="備註"
                value={newParticipant.notes || ''}
                onChange={(e) => setNewParticipant({ ...newParticipant, notes: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button onClick={handleAddParticipant} color="primary">
            儲存
          </Button>
        </DialogActions>
      </Dialog>

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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default ParticipantManagement;
