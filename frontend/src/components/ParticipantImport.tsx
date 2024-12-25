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

const ParticipantImport = () => {
  const { tournamentId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleParticipantImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('tournament_id', tournamentId || '');

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await axios.post('http://localhost:5000/api/participants/import', formData);
      setSuccess('參賽者名單匯入成功！');
    } catch (error) {
      setError('匯入失敗，請確認檔案格式是否正確');
      console.error('Error importing participants:', error);
    } finally {
      setLoading(false);
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
            onChange={handleParticipantImport}
          />
        </Button>
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
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {success}
        </Alert>
      )}
    </Box>
  );
};

export default ParticipantImport;
