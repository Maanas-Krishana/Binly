export async function createBin() {
  const response = await fetch('/api/bins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: '' })
  });
  if (!response.ok) throw new Error('Failed to create bin');
  return response.json();
}

export async function getBin(code, ownerToken = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (ownerToken) {
    headers['owner-token'] = ownerToken;
  }
  const response = await fetch(`/api/bins/${code}`, { headers });
  if (!response.ok) throw new Error('Bin not found');
  return response.json();
}

export async function saveBinContent(code, content, ownerToken) {
  const response = await fetch(`/api/bins/${code}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'owner-token': ownerToken
    },
    body: JSON.stringify({ content })
  });
  if (!response.ok) throw new Error('Failed to save content');
  return true;
}

export async function deleteBin(code, ownerToken) {
  const response = await fetch(`/api/bins/${code}`, {
    method: 'DELETE',
    headers: {
      'owner-token': ownerToken
    }
  });
  if (!response.ok) throw new Error('Failed to delete bin');
  return true;
}
