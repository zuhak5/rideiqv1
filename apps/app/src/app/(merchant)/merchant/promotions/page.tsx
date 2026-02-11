import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

export default function MerchantPromotionsPage() {
  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Promotions</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Merchant promotion management is partially available in backend contracts. Advanced promotion tooling will be expanded.
        </Typography>
        <Typography sx={{ mt: 2 }}>Coming soon.</Typography>
      </Paper>
    </Stack>
  );
}

