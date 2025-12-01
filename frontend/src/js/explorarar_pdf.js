function generatePDF() {
    const element = document.body;

    html2pdf()
        .set({
            margin: 0.4,
            filename: 'BlogMe_Explorar.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        })
        .from(element)
        .save();
}
