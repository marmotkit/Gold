// 添加匯出分組表功能
const handleExportGroups = async () => {
  try {
    console.log('開始匯出分組表...');
    const response = await fetch(buildApiUrl(`/tournaments/${tournamentId}/export_groups_diagram`), {
      method: 'GET',
      headers: {
        'Accept': 'text/html',
      }
    });

    if (!response.ok) {
      throw new Error('匯出失敗');
    }

    // 取得檔案名稱
    const contentDisposition = response.headers.get('content-disposition');
    const filenameMatch = contentDisposition && contentDisposition.match(/filename="(.+)"/);
    const filename = filenameMatch ? filenameMatch[1] : '分組表.html';

    console.log('準備下載檔案:', filename);

    // 下載檔案
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    console.log('檔案下載完成');

  } catch (error) {
    console.error('匯出分組表時發生錯誤:', error);
    alert('匯出分組表失敗：' + error.message);
  }
}; 