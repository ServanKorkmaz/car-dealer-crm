import express from "express";
import puppeteer from "puppeteer";

export const pdfRouter = express.Router();

pdfRouter.get("/contracts/:id.pdf", async (req, res) => {
  const { id } = req.params;
  const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  const url = `${baseUrl}/print/contracts/${id}`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu"
      ]
    });

    const page = await browser.newPage();
    
    // Wait for the page to load completely
    await page.goto(url, { 
      waitUntil: "networkidle0",
      timeout: 30000
    });

    // Generate PDF with proper settings
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { 
        top: "20mm", 
        right: "14mm", 
        bottom: "16mm", 
        left: "14mm" 
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size:8px;width:100%;padding:0 10mm;color:#666;display:flex;justify-content:space-between;">
          <span>KJØPEKONTRAKT – BRUKTBIL</span>
          <span style="margin-left:auto;">Generert: ${new Date().toLocaleDateString('nb-NO')}</span>
        </div>`,
      footerTemplate: `
        <div style="font-size:8px;width:100%;padding:0 10mm;color:#666;display:flex;justify-content:space-between;">
          <span>ForhandlerPRO DMS</span>
          <span style="margin-left:auto;">Side <span class="pageNumber"></span> av <span class="totalPages"></span></span>
        </div>`
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="kontrakt-${id}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({ 
      error: "Kunne ikke generere PDF", 
      details: error instanceof Error ? error.message : String(error) 
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});