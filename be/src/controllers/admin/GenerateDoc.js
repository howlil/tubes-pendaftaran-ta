import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import prisma from '../../config/db.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

export const generatePDF = async (req, res) => {
  try {
    const { idTA } = req.params;

    if (!idTA) {
      return res.status(400).json({ message: 'ID TA diperlukan' });
    }

    const taData = await prisma.tA.findUnique({
      where: { idTA },
      include: {
        Mahasiswa: true,
        DosenPembimbingTA: {
          include: {
            DosenPembimbing: {
              include: {
                Dosen: true,
              },
            },
          },
        },
      },
    });
    
    if (!taData) {
      return res.status(404).json({ message: 'Data TA tidak ditemukan' });
    }

    const { Mahasiswa, judulTA, DosenPembimbingTA } = taData;
    const pembimbing1 = DosenPembimbingTA[0];
    const pembimbing2 = DosenPembimbingTA[1];

    if (!pembimbing1) {
      return res.status(400).json({ message: 'Data pembimbing tidak lengkap' });
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);

    const imageUrl = 'https://drive.google.com/uc?export=download&id=1Kfyz7rp89_iNuhmWAwkyVBOj_TxaWKzd';
    const imageBytes = await fetch(imageUrl).then((res) => res.arrayBuffer());
    const image = await pdfDoc.embedPng(imageBytes);
    const { width, height } = image.scale(0.5);
    page.drawImage(image, {
      x: page.getWidth() / 2 - width / 2,
      y: page.getHeight() - height - 50,
      width,
      height,
    });

    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    page.setFont(font);
    page.setFontSize(12);

    const titleText = "SURAT PERSETUJUAN SIDANG TUGAS AKHIR";
    const titleWidth = font.widthOfTextAtSize(titleText, 12);
    const titleX = (page.getWidth() - titleWidth) / 2;
    const titleY = 650;
    page.drawText(titleText, { x: titleX, y: titleY });

    let content = `
      Kami pembimbing tugas akhir:
      1. ${pembimbing1.DosenPembimbing.Dosen.nama}
    `;

    if (pembimbing2) {
      content += `
      2. ${pembimbing2.DosenPembimbing.Dosen.nama}
      `;
    }

    content += `
      Untuk mahasiswa dengan:

      Nama: ${Mahasiswa.nama}
      NIM: ${Mahasiswa.nim}
      Judul Tugas Akhir: ${judulTA}

      Dengan ini menyatakan bahwa mahasiswa tersebut dapat diajukan untuk mengikuti sidang tugas akhir.
      Oleh karena itu mohon untuk diproses lebih lanjut.

                                                                                                                        Padang, ${new Date().toLocaleDateString()}

      Pembimbing I:       
      
      



      (             ${pembimbing1.DosenPembimbing.Dosen.nama}               )
      NIP. ${pembimbing1.DosenPembimbing.Dosen.nip}
    `;

                                                                                                    if (pembimbing2) {
                                                                                                      content += `


                                                                                                      Pembimbing II:
                                                                                                      (             ${pembimbing2.DosenPembimbing.Dosen.nama}               )
                                                                                                      NIP. ${pembimbing2.DosenPembimbing.Dosen.nip}
                                                                                                      `;
    }

    const lines = content.split('\n');
    let y = page.getHeight() - height - 70;
    const lineHeight = 15;

    function wrapText(text, maxWidth, font, fontSize) {
      const words = text.split(' ');
      const lines = [];
      let currentLine = '';

      words.forEach(word => {
        const lineWithWord = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(lineWithWord, fontSize);
        if (width <= maxWidth) {
          currentLine = lineWithWord;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      });

      if (currentLine) {
        lines.push(currentLine);
      }

      return lines;
    }

    const labelX = 50;
    const valueX = 200;

    for (let line of lines) {
      if (line.includes('Nama:') || line.includes('NIM:') || line.includes('Judul Tugas Akhir:')) {
        const [label, value] = line.split(': ');
        page.drawText(`${label}:`, { x: labelX, y });

        if (label.includes('Judul Tugas Akhir')) {
          const maxWidth = 250;
          const titleLines = wrapText(value, maxWidth, font, 12);
          const titleY = y - lineHeight;

          titleLines.forEach((titleLine, index) => {
            page.drawText(titleLine, { x: valueX, y: titleY - (lineHeight * index) });
          });

          y = titleY - (lineHeight * titleLines.length) - 30;
        } else {
          page.drawText(value, { x: valueX, y });
          y -= lineHeight;
        }
      } else {
        page.drawText(line.trim(), { x: 50, y });
        y -= lineHeight;
      }
    }

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
