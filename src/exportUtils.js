import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable'; // Import as a named function
export const exportToCSV = (data) => {
  const headers = ["Name", "Host", "Purpose", "Check-In", "Status"];
  const csvContent = [
    headers.join(","),
    ...data.map(v => [
      v.visitorName, 
      v.hostName, 
      v.purpose, 
      new Date(v.checkIn).toLocaleString(), 
      v.status
    ].join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Visitor_Log_${new Date().toLocaleDateString()}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};


export const exportToPDF = (data) => {
  const doc = new jsPDF();
  
  doc.text("Visitor Log Report", 14, 15);
  
  // 🚀 Use the imported autoTable function instead of doc.autoTable
  autoTable(doc, {
    head: [['Name', 'Host', 'Purpose', 'Check-In', 'Status']],
    body: data.map(v => [
      v.visitorName, 
      v.hostName, 
      v.purpose, 
      new Date(v.checkIn).toLocaleString(), 
      v.status
    ]),
    startY: 20, // Start table slightly below the header
  });
  
  doc.save(`Visitor_Log_${new Date().toLocaleDateString()}.pdf`);
};