import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';

const API_BASE_URL = 'https://gold-l1xp.onrender.com';

const ParticipantImport = () => {
  const { tournamentId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleParticipantImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 檢查檔案類型
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setError('請選擇 Excel 檔案 (.xlsx 或 .xls)');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/tournaments/${tournamentId}/participants/import`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setSuccess(`${response.data.message}`);
      
      // 觸發父組件的重新載入
      window.location.reload();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || '匯入失敗，請確認檔案格式是否正確';
      setError(errorMessage);
      console.error('Error importing participants:', error);
    } finally {
      setLoading(false);
      // 清除檔案選擇
      event.target.value = '';
    }
  };

  const handlePreGroupImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('tournament_id', tournamentId || '');

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await axios.post('http://localhost:5000/api/pregroups/import', formData);
      setSuccess('預編組名單匯入成功！');
    } catch (error) {
      setError('匯入失敗，請確認檔案格式是否正確');
      console.error('Error importing pre-groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoGroup = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await axios.post('http://localhost:5000/api/groups/auto-assign', {
        tournament_id: tournamentId
      });
      setSuccess('自動分組完成！');
    } catch (error) {
      setError('自動分組失敗');
      console.error('Error auto-grouping:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>名單匯入與分組</Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>1. 匯入參賽名單</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            component="label"
            disabled={loading}
            sx={{ minWidth: '120px' }}
          >
            選擇檔案
            <input
              type="file"
              hidden
              accept=".xlsx,.xls"
              onChange={handleParticipantImport}
            />
          </Button>
          {loading && <CircularProgress size={24} />}
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          支援的檔案格式：Excel (.xlsx, .xls)
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>2. 匯入預編組名單</Typography>
        <Button
          variant="contained"
          component="label"
          disabled={loading}
        >
          選擇檔案
          <input
            type="file"
            hidden
            accept=".xlsx,.xls"
            onChange={handlePreGroupImport}
          />
        </Button>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>3. 自動分組</Typography>
        <Button
          variant="contained"
          onClick={handleAutoGroup}
          disabled={loading}
        >
          開始自動分組
        </Button>
      </Paper>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
    </Box>
  );
};

export default ParticipantImport;
