// Keep native delivery independent of the browser download mechanism.
export async function deliverPdf(pdf, filename, native) {
  if (!native) {
    await pdf.save(filename, { returnPromise: true });
    return 'download';
  }
  const data = pdf.output('datauristring').split(',')[1];
  if (!data) throw new Error('Le PDF généré est vide.');
  if (native.saveDocument) {
    const result = await native.saveDocument.savePdf({ data });
    return result.saved ? 'saved' : 'cancelled';
  }
  const { filesystem, share, cacheDirectory } = native;
  const path = `medanon-exports/${Date.now()}-${filename}`;
  const { uri } = await filesystem.writeFile({ path, data, directory: cacheDirectory, recursive: true });
  if (!uri) throw new Error('Le fichier PDF n’a pas pu être créé.');
  // Keep the cache file after the dialog closes: receiving apps may read it later.
  await share.share({ title: 'Document anonymisé', files: [uri], dialogTitle: 'Enregistrer ou partager le PDF' });
  return 'share';
}
