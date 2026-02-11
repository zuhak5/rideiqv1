'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { FormField } from '@/design-system/components/primitives/FormField';
import { useToast } from '@/design-system/components/primitives/Toast';
import { appApi } from '@/lib/api';
import { trackEvent } from '@/lib/analytics/events';

function currentRoleFromQuery(role: string | null): 'rider' | 'driver' | 'merchant' {
  if (role === 'driver' || role === 'merchant' || role === 'rider') return role;
  return 'rider';
}

function ProfileSetupPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const { pushToast } = useToast();

  const role = useMemo(() => currentRoleFromQuery(params.get('role')), [params]);

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [locale, setLocale] = useState<'en' | 'ar'>('en');

  const [vehicleType, setVehicleType] = useState<'car_private' | 'car_taxi' | 'motorcycle' | 'cargo'>('car_private');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');

  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('restaurant');

  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error('Not authenticated');
      const userId = authData.user.id;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName || null,
          phone_e164: phone || null,
          locale,
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      if (role === 'driver') {
        const { error: driverError } = await supabase
          .from('drivers')
          .upsert({
            id: userId,
            status: 'offline',
            vehicle_type: vehicleType,
          });
        if (driverError) throw driverError;

        const { error: vehicleError } = await supabase
          .from('driver_vehicles')
          .upsert(
            {
              driver_id: userId,
              vehicle_type: vehicleType,
              make: vehicleMake || null,
              model: vehicleModel || null,
              plate_number: vehiclePlate || null,
              is_active: true,
            },
            { onConflict: 'driver_id' },
          );

        if (vehicleError) throw vehicleError;

        await appApi.setMyActiveRole('driver');
      }

      if (role === 'merchant') {
        const { data: merchantExisting } = await supabase
          .from('merchants')
          .select('id')
          .eq('owner_profile_id', userId)
          .maybeSingle();

        if (merchantExisting?.id) {
          const { error: merchantUpdateError } = await supabase
            .from('merchants')
            .update({ business_name: businessName, business_type: businessType })
            .eq('id', merchantExisting.id);
          if (merchantUpdateError) throw merchantUpdateError;
        } else {
          const { error: merchantInsertError } = await supabase.from('merchants').insert({
            owner_profile_id: userId,
            business_name: businessName,
            business_type: businessType,
            status: 'pending',
          });
          if (merchantInsertError) throw merchantInsertError;
        }

        await appApi.setMyActiveRole('merchant');
      }

      if (role === 'rider') {
        await appApi.setMyActiveRole('rider');
      }

      const { error: onboardingError } = await supabase
        .from('profiles')
        .update({ role_onboarding_completed: true })
        .eq('id', userId);

      if (onboardingError) throw onboardingError;

      await trackEvent('profile_completed', { role });
      router.push('/done');
    } catch (error) {
      pushToast(error instanceof Error ? error.message : String(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack sx={{ p: 2, maxWidth: 700, mx: 'auto' }} spacing={2}>
      <Typography variant="h4" component="h1">
        Profile setup ({role})
      </Typography>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <FormField label="Display name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          <FormField label="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+9647XXXXXXXX" />
          <FormField select label="Locale" value={locale} onChange={(event) => setLocale(event.target.value as 'en' | 'ar')}>
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="ar">Arabic</MenuItem>
          </FormField>

          {role === 'driver' ? (
            <>
              <FormField
                select
                label="Vehicle type"
                value={vehicleType}
                onChange={(event) =>
                  setVehicleType(event.target.value as 'car_private' | 'car_taxi' | 'motorcycle' | 'cargo')
                }
              >
                <MenuItem value="car_private">Car (Private)</MenuItem>
                <MenuItem value="car_taxi">Car (Taxi)</MenuItem>
                <MenuItem value="motorcycle">Motorcycle</MenuItem>
                <MenuItem value="cargo">Cargo</MenuItem>
              </FormField>
              <FormField label="Vehicle make" value={vehicleMake} onChange={(event) => setVehicleMake(event.target.value)} />
              <FormField label="Vehicle model" value={vehicleModel} onChange={(event) => setVehicleModel(event.target.value)} />
              <FormField label="Plate number" value={vehiclePlate} onChange={(event) => setVehiclePlate(event.target.value)} />
            </>
          ) : null}

          {role === 'merchant' ? (
            <>
              <FormField label="Business name" value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
              <FormField label="Business type" value={businessType} onChange={(event) => setBusinessType(event.target.value)} />
            </>
          ) : null}

          <Button variant="contained" onClick={submit} disabled={busy} sx={{ minHeight: 44 }}>
            Complete setup
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}

export default function ProfileSetupPage() {
  return (
    <Suspense
      fallback={
        <Stack sx={{ p: 2, maxWidth: 700, mx: 'auto' }}>
          <Typography>Loading...</Typography>
        </Stack>
      }
    >
      <ProfileSetupPageContent />
    </Suspense>
  );
}

