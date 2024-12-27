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
  const { tournamentId } = useParams<{ tournamentId: string }>();
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

    // 檢查 tournamentId
    if (!tournamentId) {
      setError('無法取得賽事 ID');
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
          validateStatus: function (status) {
            return status < 500; // 只有 500 以上的錯誤才拋出異常
          }
        }
      );

      if (response.status !== 200) {
        throw new Error(response.data.error || '匯入失敗');
      }

      setSuccess(response.data.message || '匯入成功！');
      
      // 觸發頁面重新載入
      window.location.reload();
    } catch (error: any) {
      console.error('Error importing participants:', error);
      const errorMessage = error.response?.data?.error || error.message || '匯入失敗，請確認檔案格式是否正確';
      setError(errorMessage);
    } finally {
      setLoading(false);
      // 清除檔案選擇
      event.target.value = '';
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>匯入參賽名單</Typography>
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
