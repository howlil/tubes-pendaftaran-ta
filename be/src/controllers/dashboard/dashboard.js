import prisma from "../../config/db.js";
import * as yup from "yup";

const dosenPembimbingIDSchema = yup.object({
  dosenPembimbingID: yup.string().required("ID dosen pembimbing diperlukan"),
});
export const getMahasiswaBimbingan = async (req, res) => {
  try {
    await dosenPembimbingIDSchema.validate(req.params);

    const { dosenPembimbingID } = req.params;

    if (!dosenPembimbingID) {
      return res
        .status(400)
        .json({ success: false, message: "ID dosen pembimbing diperlukan" });
    }

    const mahasiswaBimbingan = await prisma.dosenPembimbingTA.findMany({
      where: { dosenPembimbingID },
      include: {
        TA: {
          include: {
            Mahasiswa: true,
          },
        },
      },
    });

    const jumlahMahasiswa = mahasiswaBimbingan.reduce((count, bimbingan) => {
      if (bimbingan.TA && bimbingan.TA.Mahasiswa) {
        return count + 1;
      }
      return count;
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        dosenPembimbingID,
        jumlahMahasiswa,
        mahasiswaBimbingan,
      },
    });
  } catch (error) {
    console.error("Error getting mahasiswa bimbingan:", error);
    res.status(500).json({
      success: false,
      message: "Kesalahan server: " + error.message,
    });
  }
};

export const getJumlahDosen = async (req, res) => {
  try {
    const jumlahDosen = await prisma.dosen.count();

    if (jumlahDosen === 0) {
        return res.status(200).json({ success: true, message: "Data dosen belum ada", data: 0 });
    }

    res.status(200).json({
      success: true,
      data: {
        jumlahDosen,
      },
    });
  } catch (error) {
    console.error("Error getting jumlah dosen:", error);
    res.status(500).json({
      success: false,
      message: "Kesalahan server: " + error.message,
    });
  }
};

export const getJumlahMahasiswa = async (req, res) => {
    try {
        const jumlahMahasiswa = await prisma.mahasiswa.count();
    
        if (jumlahMahasiswa === 0) {
            return res.status(200).json({ success: true, message: "Data mahasiswa belum ada", data: 0 });
        }
    
        res.status(200).json({
        success: true,
        data: {
            jumlahMahasiswa,
        },
        });
    } catch (error) {
        console.error("Error getting jumlah mahasiswa:", error);
        res.status(500).json({
        success: false,
        message: "Kesalahan server: " + error.message,
        });
    }
}

export const getJumlahTAterdaftar = async (req, res) => {
    try {
        const jumlahTAterdaftar = await prisma.daftarTA.count({
            where: {
                status: 'disetujui', 
                TA: {
                    status: 'disetujui', 
                    statusTA: 'proposal' 
                }
            }
        });
    
        if (jumlahTAterdaftar === 0) {
            return res.status(200).json({ success: true, message: "Data TA terdaftar belum ada", data: 0 });
        }
    
        res.status(200).json({
            success: true,
            data: {
                jumlahTAterdaftar,
            },
        });
    } catch (error) {
        console.error("Error getting jumlah TA terdaftar:", error);
        res.status(500).json({
            success: false,
            message: "Kesalahan server: " + error.message,
        });
    }
}
export const getJumlahBimbinganByMahasiswa = async (req, res) => {
  const { idMahasiswa } = req.params;

  try {
    const jumlahBimbingan = await prisma.jadwalBimbinganDosen.count({
      where: {
         idMahasiswa,
      },
    });
    if (jumlahBimbingan === 0) {
      res.status(404).json({
        success: false,
        message: "Tidak ada jadwal bimbingan yang ditemukan",
      });
    }

    res.status(200).json({
      success: true,
      data: jumlahBimbingan,
    });
  } catch (error) {
    console.error("Error retrieving jumlah bimbingan:", error);
    res
      .status(500)
      .json({ success: false, message: "Kesalahan server: " + error.message });
  }
};


export const getJumlahBimbinganByDosen = async (req, res) => {
  const { idDosen } = req.params;

  try {
    const jumlahBimbingan = await prisma.jadwalBimbinganDosen.count({
      where: {
        dosenId: idDosen,
      },
    });
    if (jumlahBimbingan === 0) {
      res.status(404).json({
        success: false,
        message: "Tidak ada jadwal bimbingan yang ditemukan",
      });
    }

    res.status(200).json({
      success: true,
      data: jumlahBimbingan,
    });
  } catch (error) {
    console.error("Error retrieving jumlah bimbingan:", error);
    res
      .status(500)
      .json({ success: false, message: "Kesalahan server: " + error.message });
  }
};


export const getMahasiswaBimbinganByDosen = async(req, res)=> {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Dosen ID is required" });
    }

    const dosenPembimbing = await prisma.dosenPembimbing.findMany({
      where: { dosenId :id },
      include: {
        DosenPembimbingTA: {
          include: {
            TA: {
              include: {
                Mahasiswa: true,
                Bidang: true
              }
            }
          }
        }
      }
    });

    const mahasiswaBimbingan = dosenPembimbing.flatMap(dosen =>
      dosen.DosenPembimbingTA.map(dp => ({
        idTA: dp.idTA,
        ideTA: dp.TA.ideTA,
        deskripsiIde: dp.TA.deskripsiIde,
        statusTA: dp.TA.statusTA,
        namaMahasiswa: dp.TA.Mahasiswa.nama,
        nimMahasiswa: dp.TA.Mahasiswa.nim,
        namaBidang: dp.TA.Bidang.namaBidang
      }))
    );

    const jumlahMahasiswaBimbingan = mahasiswaBimbingan.length;

    res.json({ success: true, data: mahasiswaBimbingan, jumlah: jumlahMahasiswaBimbingan });
  } catch (error) {
    console.error("Error retrieving mahasiswa bimbingan:", error);
    res.status(500).json({ success: false, message: "Kesalahan server: " + error.message });
  }
}