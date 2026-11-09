import Box from '@mui/material/Box';

function PdfFrameMUI({ url, name }: { url: string; name: string }) {
  return (
    <Box
      component="iframe"
      src={url}
      title={name}
      sx={{ flex: 1, minHeight: '60vh', width: '100%', border: 0, borderRadius: 1 }}
    />
  );
}

export default PdfFrameMUI;
