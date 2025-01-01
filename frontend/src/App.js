import React, { useState } from 'react';
import { 
  Container, 
  AppBar, 
  Toolbar, 
  Typography, 
  Box,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import ParticipantManagement from './components/ParticipantManagement';
import GroupManagement from './components/GroupManagement';
import CheckInManagement from './components/CheckInManagement';
import TournamentManagement from './components/TournamentManagement';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box p={3}>{children}</Box>}
    </div>
  );
}

function App() {
  const [tabValue, setTabValue] = useState(0); 
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [version, setVersion] = useState(localStorage.getItem('appVersion') || '1.0');

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleTournamentSelect = (tournament) => {
    console.log('Tournament selected:', tournament);
    setSelectedTournament(tournament);
    // 移除 setTabValue(0); 讓用戶保持在當前標籤
  };

  const handleVersionClick = (event) => {
    event.preventDefault();
    
    setVersion(prevVersion => {
      const [major, minor] = prevVersion.split('.').map(Number);
      
      // 處理版本號增加（左鍵）
      if (event.button !== 2) {
        if (minor === 9) {
          // 如果小版本是 9，則主版本加 1，小版本歸 0
          const newVersion = `${major + 1}.0`;
          localStorage.setItem('appVersion', newVersion);
          return newVersion;
        } else {
          // 否則小版本加 1
          const newVersion = `${major}.${minor + 1}`;
          localStorage.setItem('appVersion', newVersion);
          return newVersion;
        }
      } 
      // 處理版本號減少（右鍵）
      else {
        if (minor === 0 && major > 1) {
          // 如果小版本是 0 且主版本大於 1，則主版本減 1，小版本變 9
          const newVersion = `${major - 1}.9`;
          localStorage.setItem('appVersion', newVersion);
          return newVersion;
        } else if (minor === 0 && major === 1) {
          // 如果是 1.0，則保持不變
          return prevVersion;
        } else {
          // 否則小版本減 1
          const newVersion = `${major}.${minor - 1}`;
          localStorage.setItem('appVersion', newVersion);
          return newVersion;
        }
      }
    });
  };

  return (
    <Container maxWidth="lg" role="main">
      <Box 
        sx={{ 
          minHeight: 'calc(100vh - 50px)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Paper 
          elevation={0} 
          sx={{ 
            bgcolor: '#1976d2', 
            color: 'white',
            p: 2,
            mb: 2,
            borderRadius: 0
          }}
        >
          <Typography variant="h4" component="h1" align="center">
            清華大學校友高球隊 2025
          </Typography>
        </Paper>

        <AppBar position="static" color="default">
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6" component="h1">
              高爾夫球賽管理系統
            </Typography>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                cursor: 'pointer',
                color: 'rgba(0,0,0,0.6)',
                '&:hover': {
                  color: 'primary.main'
                },
                userSelect: 'none'
              }}
              onClick={handleVersionClick}
              onContextMenu={handleVersionClick}
            >
              V{version}
            </Typography>
          </Toolbar>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="管理功能選單"
            variant="scrollable"
            scrollButtons="auto"
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab 
              label="賽事管理" 
              id="tab-0"
              aria-controls="tabpanel-0"
            />
            <Tab 
              label="參賽者管理"
              id="tab-1"
              aria-controls="tabpanel-1"
              disabled={!selectedTournament}
            />
            <Tab 
              label="分組管理"
              id="tab-2"
              aria-controls="tabpanel-2"
              disabled={!selectedTournament}
            />
            <Tab 
              label="報到管理"
              id="tab-3"
              aria-controls="tabpanel-3"
              disabled={!selectedTournament}
            />
          </Tabs>
        </AppBar>

        <Paper sx={{ p: 2, mb: 2 }}>
          <TabPanel value={tabValue} index={0}>
            <TournamentManagement onTournamentSelect={handleTournamentSelect} />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <ParticipantManagement tournament={selectedTournament} />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <GroupManagement tournament={selectedTournament} />
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <CheckInManagement tournament={selectedTournament} />
          </TabPanel>
        </Paper>
      </Box>
      
      <Box sx={{ 
        height: '50px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        borderTop: '1px solid #e0e0e0',
        color: '#666',
        fontSize: '0.875rem'
      }}>
        Design by KT. Liang
      </Box>
    </Container>
  );
}

export default App;
