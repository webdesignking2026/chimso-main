import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';

type Props = {
  onDone: () => void;
};

export default function SplashScreen({ onDone }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setShow(true), 50);
    const doneTimer = setTimeout(() => onDone(), 2600);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
      }}
    >
      <Fade in={show} timeout={{ enter: 900 }}>
        <Box
          component="img"
          src="/chimsologo.png"
          alt="Chimso"
          sx={{
            width: 72,
            height: 72,
            borderRadius: '18px',
          }}
        />
      </Fade>

      <Fade in={show} timeout={{ enter: 1200, exit: 0 }}>
        <Box
          sx={{
            textAlign: 'center',
            mt: 1,
          }}
        >
          <Box
            component="span"
            sx={{
              fontSize: '0.75rem',
              fontWeight: 400,
              color: 'text.disabled',
              letterSpacing: '0.02em',
            }}
          >
            Powered by Blissful Touch Media
          </Box>
        </Box>
      </Fade>
    </Box>
  );
}
