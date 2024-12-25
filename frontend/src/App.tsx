import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container } from '@mui/material';

import Navigation from './components/Navigation';
import TournamentList from './components/TournamentList';
import ParticipantImport from './components/ParticipantImport';
import CheckIn from './components/CheckIn';
import ParticipantManagement from './components/ParticipantManagement';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2e7d32',
    },
    secondary: {
      main: '#1976d2',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Navigation />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Routes>
            <Route path="/" element={<TournamentList />} />
            <Route path="/import/:tournamentId" element={<ParticipantImport />} />
            <Route path="/checkin/:tournamentId" element={<CheckIn />} />
            <Route path="/participants/:tournamentId" element={<ParticipantManagement />} />
          </Routes>
        </Container>
      </Router>
    </ThemeProvider>
  );
}

export default App;
