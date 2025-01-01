import React, { useState } from 'react';
import { AppBar, Toolbar, Typography } from '@mui/material';

function Layout({ children }) {
  const [version, setVersion] = useState('1.0');

  const handleVersionClick = () => {
    setVersion(prevVersion => {
      const [major, minor] = prevVersion.split('.');
      const newMinor = parseInt(minor) + 1;
      return `${major}.${newMinor}`;
    });
  };

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: '#2196f3' }}>
        <Toolbar>
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, color: 'white' }}>
            清華大學校友高球隊 2025
          </Typography>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)',
              '&:hover': {
                color: 'white'
              }
            }}
            onClick={handleVersionClick}
          >
            V{version}
          </Typography>
        </Toolbar>
      </AppBar>
      {children}
    </>
  );
}

export default Layout; 