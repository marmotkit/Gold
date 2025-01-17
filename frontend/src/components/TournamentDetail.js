import React, { useState } from 'react';
import ParticipantManagement from './ParticipantManagement';
import DynamicGrouping from './DynamicGrouping';

const TournamentDetail = () => {
    const [updateTrigger, setUpdateTrigger] = useState(0);

    const handleParticipantUpdate = () => {
        setUpdateTrigger(prev => prev + 1);
    };

    return (
        <>
            <ParticipantManagement 
                onParticipantUpdate={handleParticipantUpdate}
                updateTrigger={updateTrigger}
            />
            <DynamicGrouping
                onParticipantUpdate={handleParticipantUpdate}
                updateTrigger={updateTrigger}
            />
        </>
    );
};

export default TournamentDetail; 