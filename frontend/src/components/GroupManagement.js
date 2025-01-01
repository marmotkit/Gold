import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  IconButton,
  Grid,
  Paper,
  List
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MaleIcon from '@mui/icons-material/Male';
import FemaleIcon from '@mui/icons-material/Female';
import WarningIcon from '@mui/icons-material/Warning';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { apiConfig } from '../config';

function ParticipantCard({ participant, onDelete, onDragStart, onDragEnd, isDragging, isOverflow }) {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        p: 1,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        '&:hover': {
          bgcolor: 'action.hover'
        },
        ...(isOverflow && {
          backgroundColor: '#fff3e0',
          border: '1px solid #ffe0b2'
        })
      }}
      draggable={true}
      onDragStart={(e) => onDragStart(e, participant)}
      onDragEnd={onDragEnd}
    >
      <IconButton size="small" sx={{ mr: 1, cursor: 'move' }}>
        <DragHandleIcon />
      </IconButton>
      <Typography>
        {participant.name}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto', mr: 1 }}>
        {participant.check_in_status === 'checked_in' && (
          <Chip 
            label="已報到" 
            size="small" 
            color="success" 
            sx={{ mr: 1 }}
          />
        )}
        <Box
          component="span"
          sx={{
            display: 'flex',
            alignItems: 'center',
            color: participant.gender === 'F' ? '#f06292' : '#2196f3',
            mx: 1
          }}
        >
          {participant.gender === 'F' ? (
            <FemaleIcon fontSize="small" />
          ) : (
            <MaleIcon fontSize="small" />
          )}
        </Box>
        <Typography
          component="span"
          sx={{
            px: 1,
            py: 0.25,
            borderRadius: '12px',
            bgcolor: 'background.paper',
            fontSize: '0.875rem',
            color: 'text.secondary'
          }}
        >
          差點: {participant.handicap}
        </Typography>
      </Box>
      <IconButton
        size="small"
        onClick={onDelete}
        sx={{
          color: 'error.light',
          '&:hover': {
            color: 'error.main'
          }
        }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

function GroupManagement({ tournament, onSave }) {
  const [groups, setGroups] = useState({});
  const [groupOrder, setGroupOrder] = useState([]); 
  const [draggedParticipant, setDraggedParticipant] = useState(null);
  const [dragOverGroup, setDragOverGroup] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [nextGroupNumber, setNextGroupNumber] = useState(1);
  const [ungroupedParticipants, setUngroupedParticipants] = useState([]);

  // 載入參賽者數據
  const loadParticipants = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${apiConfig.apiUrl}/tournaments/${tournament.id}/participants`
      );

      if (!response.ok) {
        throw new Error('載入參賽者失敗');
      }

      const data = await response.json();
      
      // 設置未分組的參賽者
      const ungroupedParticipants = data.filter(p => !p.group_code || p.group_code === '未分組');
      setUngroupedParticipants(ungroupedParticipants);
      
      // 設置已分組的參賽者
      const groupedData = data.reduce((acc, participant) => {
        if (participant.group_code && participant.group_code !== '未分組') {
          if (!acc[participant.group_code]) {
            acc[participant.group_code] = [];
          }
          acc[participant.group_code].push(participant);
        }
        return acc;
      }, {});
      
      setGroups(groupedData);
      
      // 設置組別順序
      const order = Object.keys(groupedData)
        .sort((a, b) => parseInt(a) - parseInt(b));
      setGroupOrder(order);
    } catch (error) {
      console.error('載入參賽者錯誤:', error);
      setSnackbar({
        open: true,
        message: error.message || '載入參賽者失敗',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [tournament.id]);

  useEffect(() => {
    if (tournament) {
      loadParticipants();
    }
  }, [tournament]);

  // 處理刪除分組
  const handleDeleteGroup = async (groupCode) => {
    try {
      setIsLoading(true);

      // 獲取要刪除的組別中的參賽者
      const groupParticipants = groups[groupCode] || [];
      
      // 將參賽者移動到未分組
      const updatedGroups = { ...groups };
      if (!updatedGroups['未分組']) {
        updatedGroups['未分組'] = [];
      }
      updatedGroups['未分組'] = [...updatedGroups['未分組'], ...groupParticipants];
      
      // 刪除該組別
      delete updatedGroups[groupCode];
      
      // 更新組別順序
      const newOrder = groupOrder.filter(g => g !== groupCode);
      
      setGroups(updatedGroups);
      setGroupOrder(newOrder);
      setHasUnsavedChanges(true);

      setSnackbar({
        open: true,
        message: '分組已刪除',
        severity: 'success'
      });
    } catch (error) {
      console.error('刪除分組錯誤:', error);
      setSnackbar({
        open: true,
        message: '刪除分組失敗',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 處理差點排序
  const handleSortByHandicap = async () => {
    try {
      setIsLoading(true);

      // 對每個組別內的參賽者按差點排序
      const sortedGroups = {};
      Object.entries(groups).forEach(([groupCode, groupParticipants]) => {
        sortedGroups[groupCode] = [...groupParticipants].sort((a, b) => {
          const handicapA = a.handicap === 999 ? 0 : a.handicap;
          const handicapB = b.handicap === 999 ? 0 : b.handicap;
          return handicapA - handicapB;
        });
      });

      setGroups(sortedGroups);
      setHasUnsavedChanges(true);

      setSnackbar({
        open: true,
        message: '差點排序完成',
        severity: 'success'
      });
    } catch (error) {
      console.error('差點排序錯誤:', error);
      setSnackbar({
        open: true,
        message: '差點排序失敗',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 處理儲存分組
  const handleSaveGroups = async () => {
    try {
      setIsLoading(true);

      // 準備要儲存的數據
      const groupData = {};
      Object.entries(groups).forEach(([groupCode, groupParticipants]) => {
        if (groupCode !== '未分組') {
          groupData[groupCode] = groupParticipants.map(p => p.id);
        }
      });

      // 轉換數據格式
      const groupsToSave = Object.entries(groupData).map(([group_code, participant_ids]) => ({
        group_code,
        participant_ids
      }));

      // 添加未分組的參賽者
      if (ungroupedParticipants.length > 0) {
        groupsToSave.push({
          group_code: '未分組',
          participant_ids: ungroupedParticipants.map(p => p.id)
        });
      }

      // 發送儲存請求
      const response = await fetch(
        `${apiConfig.apiUrl}/tournaments/${tournament.id}/save_groups`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            groups: groupsToSave,
            group_order: groupOrder
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '儲存分組失敗');
      }

      // 重新載入參賽者列表
      const participantsResponse = await fetch(`${apiConfig.apiUrl}/tournaments/${tournament.id}/participants`);
      if (!participantsResponse.ok) {
        throw new Error('無法重新載入參賽者列表');
      }
      const participantsData = await participantsResponse.json();
      
      // 更新本地狀態
      const newGroups = {};
      const newUngroupedParticipants = [];
      
      participantsData.forEach(participant => {
        if (participant.group_code) {
          if (!newGroups[participant.group_code]) {
            newGroups[participant.group_code] = [];
          }
          newGroups[participant.group_code].push(participant);
        } else {
          newUngroupedParticipants.push(participant);
        }
      });

      // 按照 display_order 排序每個組的參賽者
      Object.keys(newGroups).forEach(groupCode => {
        newGroups[groupCode].sort((a, b) => a.display_order - b.display_order);
      });

      setGroups(newGroups);
      setUngroupedParticipants(newUngroupedParticipants);
      setHasUnsavedChanges(false);
      
      setSnackbar({
        open: true,
        message: '分組儲存成功',
        severity: 'success'
      });

      // 如果有 onSave 回調，則調用它
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('儲存分組錯誤:', error);
      setSnackbar({
        open: true,
        message: error.message || '儲存分組失敗',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 處理匯出分組
  const handleExportGroups = async () => {
    try {
      setIsLoading(true);

      // 下載 Excel 檔案
      window.location.href = `${apiConfig.apiUrl}/tournaments/${tournament.id}/export_groups`;
      
      setSnackbar({
        open: true,
        message: '分組名單匯出成功',
        severity: 'success'
      });

    } catch (error) {
      console.error('匯出分組錯誤:', error);
      setSnackbar({
        open: true,
        message: '匯出分組失敗',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 處理匯出分組圖
  const handleExportGroupsDiagram = async () => {
    try {
      window.location.href = `${apiConfig.apiUrl}/tournaments/${tournament.id}/export_groups_diagram`;
      
      setSnackbar({
        open: true,
        message: '分組圖匯出成功',
        severity: 'success'
      });
    } catch (error) {
      console.error('匯出分組圖錯誤:', error);
      setSnackbar({
        open: true,
        message: '匯出分組圖失敗',
        severity: 'error'
      });
    }
  };

  // 處理將參賽者從分組中移除
  const handleRemoveFromGroup = useCallback(async (groupCode, participantId) => {
    try {
      // 先更新前端狀態
      setGroups(prevGroups => {
        const updatedGroups = { ...prevGroups };
        
        // 找到參賽者當前的分組
        let currentGroup = null;
        let participant = null;
        
        for (const [code, groupParticipants] of Object.entries(updatedGroups)) {
          const found = groupParticipants.find(p => p.id === participantId);
          if (found) {
            currentGroup = code;
            participant = found;
            break;
          }
        }
        
        if (currentGroup && participant) {
          // 從當前分組中移除
          updatedGroups[currentGroup] = updatedGroups[currentGroup].filter(
            p => p.id !== participantId
          );
          
          // 添加到未分組
          if (!updatedGroups['未分組']) {
            updatedGroups['未分組'] = [];
          }
          updatedGroups['未分組'].push(participant);
        }
        
        return updatedGroups;
      });

      // 更新後端
      const response = await fetch(
        `${apiConfig.apiUrl}/tournaments/${tournament.id}/participants/${participantId}/group`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            group_code: '未分組'
          })
        }
      );

      if (!response.ok) {
        throw new Error('移除參賽者失敗');
      }

      setHasUnsavedChanges(true);
      setSnackbar({
        open: true,
        message: '已將參賽者移至未分組',
        severity: 'success'
      });

    } catch (error) {
      console.error('Error removing participant from group:', error);
      setSnackbar({
        open: true,
        message: '移除參賽者失敗',
        severity: 'error'
      });
    }
  }, [tournament]);

  // 新增分組功能
  const handleAddGroup = () => {
    setGroups(prevGroups => {
      // 找出目前最大的組別編號
      const existingGroups = Object.keys(prevGroups)
        .filter(key => key !== '未分組')
        .map(key => parseInt(key))
        .filter(num => !isNaN(num));
      
      const maxGroup = existingGroups.length > 0 ? Math.max(...existingGroups) : 0;
      const newGroupNumber = (maxGroup + 1).toString();
      
      // 創建新分組
      return {
        ...prevGroups,
        [newGroupNumber]: []
      };
    });
    setHasUnsavedChanges(true);
  };

  // 處理自動分組
  const handleAutoGroup = async () => {
    try {
      setIsLoading(true);

      // 發送自動分組請求
      const response = await fetch(
        `${apiConfig.apiUrl}/tournaments/${tournament.id}/auto-group`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || '自動分組失敗');
      }

      console.log('自動分組結果:', result);

      // 重新載入參賽者數據
      await loadParticipants();
      
      // 更新前端狀態
      setSnackbar({
        open: true,
        message: '自動分組成功',
        severity: 'success'
      });
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('自動分組錯誤:', error);
      setSnackbar({
        open: true,
        message: error.message || '自動分組失敗',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 處理拖動開始
  const handleDragStart = (e, participant) => {
    e.dataTransfer.setData('participant', JSON.stringify(participant));
    setDraggedParticipant(participant);
  };

  // 處理拖動結束
  const handleDragEnd = () => {
    setDraggedParticipant(null);
    setDragOverGroup(null);
  };

  // 處理拖動經過
  const handleDragOver = (e, groupCode) => {
    e.preventDefault();
    if (groupCode !== dragOverGroup) {
      setDragOverGroup(groupCode);
    }
    e.dataTransfer.dropEffect = 'move';
  };

  // 處理拖動離開
  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOverGroup(null);
  };

  // 處理放置
  const handleDrop = async (e, targetGroup) => {
    e.preventDefault();
    setDragOverGroup(null);

    if (!draggedParticipant) return;

    try {
      const sourceGroup = groups[draggedParticipant.group_code];
      const targetGroupParticipants = groups[targetGroup] || [];
      
      // 如果是在同一組內拖動，處理排序
      if (draggedParticipant.group_code === targetGroup) {
        // 找到拖放位置的目標元素
        const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
        const participantItem = dropTarget.closest('[data-participant-id]');
        
        if (participantItem) {
          const targetId = parseInt(participantItem.getAttribute('data-participant-id'));
          const targetIndex = targetGroupParticipants.findIndex(p => p.id === targetId);
          const sourceIndex = targetGroupParticipants.findIndex(p => p.id === draggedParticipant.id);
          
          if (targetIndex !== -1 && sourceIndex !== -1) {
            const newParticipants = [...targetGroupParticipants];
            const [removed] = newParticipants.splice(sourceIndex, 1);
            newParticipants.splice(targetIndex, 0, removed);
            
            setGroups(prev => ({
              ...prev,
              [targetGroup]: newParticipants
            }));
            setHasUnsavedChanges(true);
            return;
          }
        }
      }

      // 處理跨組拖動
      const response = await fetch(
        `${apiConfig.apiUrl}/tournaments/${tournament.id}/participants/${draggedParticipant.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            group_code: targetGroup
          }),
        }
      );

      if (!response.ok) {
        throw new Error('更新分組失敗');
      }

      const result = await response.json();
      console.log('更新結果:', result);

      // 重新載入參賽者數據
      await loadParticipants();
      setHasUnsavedChanges(true);

    } catch (error) {
      console.error('更新分組錯誤:', error);
      setSnackbar({
        open: true,
        message: error.message || '更新分組失敗',
        severity: 'error'
      });
    }
  };

  // 處理參賽者順序調整
  const handleReorderParticipants = async (groupCode, participantId, direction) => {
    const currentGroup = groups[groupCode];
    const currentIndex = currentGroup.findIndex(p => p.id === participantId);
    
    if (
      (direction === 'up' && currentIndex === 0) || 
      (direction === 'down' && currentIndex === currentGroup.length - 1)
    ) {
      return; // 已經在最上或最下，不需要移動
    }
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newParticipants = [...currentGroup];
    [newParticipants[currentIndex], newParticipants[newIndex]] = 
    [newParticipants[newIndex], newParticipants[currentIndex]];
    
    // 更新本地狀態
    setGroups(prev => ({
      ...prev,
      [groupCode]: newParticipants
    }));
    
    try {
      // 發送更新請求到後端
      const response = await fetch(
        `${apiConfig.apiUrl}/tournaments/${tournament.id}/groups/${groupCode}/reorder`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            participant_ids: newParticipants.map(p => p.id)
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('更新順序失敗');
      }
      
    } catch (error) {
      console.error('Error updating order:', error);
      setSnackbar({
        open: true,
        message: '更新順序失敗',
        severity: 'error'
      });
      
      // 如果失敗，恢復原始順序
      setGroups(prev => ({
        ...prev,
        [groupCode]: currentGroup
      }));
    }
  };

  // 處理分組順序調整
  const handleReorderGroups = async (groupCode, direction) => {
    const currentIndex = groupOrder.indexOf(groupCode);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= groupOrder.length) return;

    try {
      // 獲取要交換的兩個組別
      const group1 = groupOrder[currentIndex];
      const group2 = groupOrder[newIndex];

      // 更新後端
      const response = await fetch(
        `${apiConfig.apiUrl}/tournaments/${tournament.id}/groups/reorder`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            group1,
            group2
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '重新排序失敗');
      }

      // 更新前端顯示
      const newOrder = [...groupOrder];
      [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
      setGroupOrder(newOrder);

      // 重新載入參賽者數據以確保順序正確
      await loadParticipants();

      setSnackbar({
        open: true,
        message: '重新排序成功',
        severity: 'success'
      });
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('重新排序錯誤:', error);
      setSnackbar({
        open: true,
        message: error.message || '重新排序失敗',
        severity: 'error'
      });
    }
  };

  // 處理更新參賽者組別
  const updateParticipantGroup = async (participantId, newGroupCode) => {
    try {
      console.log(`更新參賽者 ${participantId} 到組別 ${newGroupCode}`);
      
      const response = await fetch(
        `${apiConfig.apiUrl}/tournaments/${tournament.id}/participants/${participantId}/group`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            group_code: newGroupCode
          })
        }
      );

      if (!response.ok) {
        throw new Error('更新參賽者組別失敗');
      }

      setHasUnsavedChanges(true);
      setSnackbar({
        open: true,
        message: '更新參賽者組別成功',
        severity: 'success'
      });

    } catch (error) {
      console.error('Error updating participant group:', error);
      setSnackbar({
        open: true,
        message: '更新參賽者組別失敗',
        severity: 'error'
      });
    }
  };

  // 處理預分組編號的顯示邏輯
  const renderGroup = (groupCode, index) => {
    const participants = groups[groupCode] || [];
    if (participants.length === 0) return null;

    // 只顯示當前組別中最常見的預分組編號
    const preGroupCounts = participants.reduce((acc, p) => {
      if (p.pre_group_code) {
        acc[p.pre_group_code] = (acc[p.pre_group_code] || 0) + 1;
      }
      return acc;
    }, {});

    let preGroupNumber = '';
    if (Object.keys(preGroupCounts).length > 0) {
      // 找出出現次數最多的預分組編號
      preGroupNumber = Object.entries(preGroupCounts)
        .sort(([,a], [,b]) => b - a)[0][0];
    }

    const isDropTarget = dragOverGroup === groupCode;
    const regularParticipants = participants.slice(0, 4);
    const overflowParticipants = participants.slice(4);

    return (
      <Grid item xs={12} sm={6} md={4} key={`group-${groupCode}`}>
        <Paper 
          elevation={3}
          sx={{
            p: 2,
            position: 'relative',
            border: isDropTarget 
              ? '2px dashed #2196f3' 
              : '1px solid rgba(0, 0, 0, 0.12)',
            backgroundColor: isDropTarget 
              ? 'rgba(33, 150, 243, 0.08)'
              : 'background.paper',
            transition: 'all 0.2s ease'
          }}
          onDragOver={(e) => handleDragOver(e, groupCode)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, groupCode)}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  flexGrow: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                第 {groupCode} 組 {participants.length} 人
              </Typography>
              <Box 
                className="group-actions"
                sx={{
                  display: 'flex',
                  gap: 1,
                  ml: 1
                }}
              >
                {index > 0 && (
                  <IconButton
                    size="small"
                    onClick={() => handleReorderGroups(groupCode, 'up')}
                    title="向上移動"
                  >
                    <KeyboardArrowUpIcon />
                  </IconButton>
                )}
                {index < groupOrder.length - 1 && (
                  <IconButton
                    size="small"
                    onClick={() => handleReorderGroups(groupCode, 'down')}
                    title="向下移動"
                  >
                    <KeyboardArrowDownIcon />
                  </IconButton>
                )}
              </Box>
            </Box>
            {preGroupNumber && (
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  mt: 0.5,
                  fontSize: '0.75rem',
                  lineHeight: 1
                }}
              >
                預分組: {preGroupNumber}
              </Typography>
            )}
          </Box>

          {/* 主要參賽者區域 */}
          <List disablePadding>
            {regularParticipants.map((participant) => (
              <Box 
                key={`participant-${participant.id}`}
                data-participant-id={participant.id}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  p: 1,
                  opacity: draggedParticipant?.id === participant.id ? 0.5 : 1,
                  cursor: 'move',
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, participant)}
                onDragEnd={handleDragEnd}
              >
                <DragHandleIcon sx={{ mr: 1, color: 'action.active', cursor: 'move' }} />
                <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
                  <Typography 
                    sx={{ 
                      flexGrow: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {participant.name}
                  </Typography>
                  {participant.check_in_status === 'checked_in' && (
                    <Chip 
                      label="已報到" 
                      size="small" 
                      color="success" 
                      sx={{ mx: 1 }}
                    />
                  )}
                  <Box
                    component="span"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      color: participant.gender === 'F' ? '#f06292' : '#2196f3',
                      mx: 1
                    }}
                  >
                    {participant.gender === 'F' ? (
                      <FemaleIcon fontSize="small" />
                    ) : (
                      <MaleIcon fontSize="small" />
                    )}
                  </Box>
                  <Typography sx={{ ml: 1, whiteSpace: 'nowrap' }}>
                    差點: {participant.handicap}
                  </Typography>
                </Box>
                <IconButton 
                  size="small" 
                  onClick={() => handleRemoveFromGroup(participant.group_code, participant.id)}
                  sx={{ ml: 1 }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
          </List>

          {/* 臨時等待區 */}
          {overflowParticipants.length > 0 && (
            <Box
              sx={{
                mt: 2,
                p: 1,
                bgcolor: '#fff3e0',
                borderRadius: 1,
                border: '1px dashed #ffb74d'
              }}
            >
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  mb: 1,
                  color: '#f57c00',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <WarningIcon fontSize="small" />
                臨時等待區 ({overflowParticipants.length})
              </Typography>
              <List disablePadding dense>
                {overflowParticipants.map((participant) => (
                  <Box 
                    key={`participant-${participant.id}`}
                    data-participant-id={participant.id}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      p: 1,
                      opacity: draggedParticipant?.id === participant.id ? 0.5 : 1,
                      cursor: 'move',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      },
                      backgroundColor: '#fff3e0',
                      border: '1px solid #ffe0b2'
                    }}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, participant)}
                    onDragEnd={handleDragEnd}
                  >
                    <DragHandleIcon sx={{ mr: 1, color: 'action.active', cursor: 'move' }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
                      <Typography 
                        sx={{ 
                          flexGrow: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {participant.name}
                      </Typography>
                      {participant.check_in_status === 'checked_in' && (
                        <Chip 
                          label="已報到" 
                          size="small" 
                          color="success" 
                          sx={{ mx: 1 }}
                        />
                      )}
                      <Box
                        component="span"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          color: participant.gender === 'F' ? '#f06292' : '#2196f3',
                          mx: 1
                        }}
                      >
                        {participant.gender === 'F' ? (
                          <FemaleIcon fontSize="small" />
                        ) : (
                          <MaleIcon fontSize="small" />
                        )}
                      </Box>
                      <Typography sx={{ ml: 1, whiteSpace: 'nowrap' }}>
                        差點: {participant.handicap}
                      </Typography>
                    </Box>
                    <IconButton 
                      size="small" 
                      onClick={() => handleRemoveFromGroup(participant.group_code, participant.id)}
                      sx={{ ml: 1 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
              </List>
            </Box>
          )}
        </Paper>
      </Grid>
    );
  };

  // 渲染所有分組
  const renderGroups = () => {
    return (
      <Grid container spacing={3}>
        {groupOrder.map((groupCode, index) => (
          renderGroup(groupCode, index)
        ))}

        {/* 未分組的參賽者 */}
        {ungroupedParticipants.length > 0 && (
          <Grid item xs={12}>
            <Paper 
              elevation={3}
              sx={{
                p: 2,
                border: dragOverGroup === '未分組' ? '2px dashed #2196f3' : '1px solid rgba(0, 0, 0, 0.12)',
                backgroundColor: dragOverGroup === '未分組' ? 'rgba(33, 150, 243, 0.08)' : 'background.paper'
              }}
              onDragOver={(e) => handleDragOver(e, '未分組')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, '未分組')}
            >
              <Typography variant="h6" gutterBottom>
                未分組 ({ungroupedParticipants.length})
              </Typography>
              <Grid container spacing={1}>
                {ungroupedParticipants.map((participant) => (
                  <Grid item xs={12} sm={6} md={3} key={`ungrouped-${participant.id}`}>
                    <Box 
                      data-participant-id={participant.id}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        p: 1,
                        opacity: draggedParticipant?.id === participant.id ? 0.5 : 1,
                        cursor: 'move',
                        '&:hover': {
                          bgcolor: 'action.hover'
                        }
                      }}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, participant)}
                      onDragEnd={handleDragEnd}
                    >
                      <DragHandleIcon sx={{ mr: 1, color: 'action.active', cursor: 'move' }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
                        <Typography 
                          sx={{ 
                            flexGrow: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {participant.name}
                        </Typography>
                        {participant.check_in_status === 'checked_in' && (
                          <Chip 
                            label="已報到" 
                            size="small" 
                            color="success" 
                            sx={{ mx: 1 }}
                          />
                        )}
                        <Box
                          component="span"
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            color: participant.gender === 'F' ? '#f06292' : '#2196f3',
                            mx: 1
                          }}
                        >
                          {participant.gender === 'F' ? (
                            <FemaleIcon fontSize="small" />
                          ) : (
                            <MaleIcon fontSize="small" />
                          )}
                        </Box>
                        <Typography sx={{ ml: 1, whiteSpace: 'nowrap' }}>
                          差點: {participant.handicap}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>
    );
  };

  // 添加新的樣式
  const styles = `
    .overflow-container {
      margin-top: 16px;
      padding: 8px;
      background-color: #f5f5f5;
      border-radius: 4px;
      border: 1px dashed #ccc;
    }

    .overflow-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .participant-card.overflow {
      background-color: #fff3e0;
      border: 1px solid #ffe0b2;
    }
  `;

  useEffect(() => {
    // 添加樣式到 head
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={handleAutoGroup}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          自動分組
        </Button>
        <Button
          variant="contained"
          onClick={handleSortByHandicap}
          disabled={isLoading}
          color="secondary"
        >
          差點排序
        </Button>
        <Button
          variant="outlined"
          onClick={handleAddGroup}
          disabled={isLoading}
          startIcon={<AddIcon />}
        >
          新增分組
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleSaveGroups}
          disabled={isLoading || !hasUnsavedChanges}
          startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          儲存分組
        </Button>
        <Button
          variant="outlined"
          color="primary"
          onClick={handleExportGroups}
          disabled={isLoading || Object.keys(groups).length === 0}
          startIcon={isLoading ? <CircularProgress size={20} /> : <FileDownloadIcon />}
          sx={{ mr: 1 }}
        >
          匯出分組
        </Button>
        <Button
          variant="outlined"
          color="primary"
          onClick={handleExportGroupsDiagram}
          disabled={isLoading || Object.keys(groups).length === 0}
          startIcon={isLoading ? <CircularProgress size={20} /> : <FileDownloadIcon />}
        >
          匯出分組圖
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        renderGroups()
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default GroupManagement;
