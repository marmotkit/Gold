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
import TournamentManagement from './components/TournamentManagement';
import ParticipantManagement from './components/ParticipantManagement';
import GroupManagement from './components/GroupManagement';
import CheckInManagement from './components/CheckInManagement';

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
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function App() {
  const [tabValue, setTabValue] = useState(0);
  const [selectedTournament, setSelectedTournament] = useState(null);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleTournamentSelect = (tournament) => {
    console.log('Tournament selected:', tournament);
    setSelectedTournament(tournament);
    // 選擇賽事後自動切換到參賽者管理頁面
    setTabValue(1);
  };

  return (
    <Container maxWidth="lg">
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
          <Toolbar>
            <Typography variant="h6" component="h1">
              高爾夫球賽管理系統
            </Typography>
          </Toolbar>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="管理功能選單"
            variant="scrollable"
            scrollButtons="auto"
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
