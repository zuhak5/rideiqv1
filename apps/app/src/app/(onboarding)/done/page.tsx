import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

export default function OnboardingDonePage() {
  return (
    <Stack sx={{ minHeight: '80dvh', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: 480 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Setup complete
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Your role and profile are ready. Continue to your role home.
        </Typography>
        <Button href="/rider/home" variant="contained" fullWidth sx={{ minHeight: 44 }}>
          Continue
        </Button>
      </Paper>
    </Stack>
  );
}

