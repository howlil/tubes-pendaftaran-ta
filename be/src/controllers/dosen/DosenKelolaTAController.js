import prisma from "../../config/db.js";
import { status, statusTA, tipeDosen } from "../../config/typeEnum.js";

import * as yup from "yup";

const accIdeTASchema = yup.object().shape({
  idTA: yup.string().required("ID TA wajib diisi"),
  isApproved: yup.bool().required("Status persetujuan wajib diisi"),
  id: yup.string().required("ID pembimbing wajib diisi"),
});
const accJudulTASchema = yup.object().shape({
  idTA: yup.string().required("ID TA wajib diisi"),
  isApproved: yup.bool().required("Status persetujuan wajib diisi"),
  id: yup.string().required("ID pembimbing wajib diisi"),
});

export const accIdeTA = async (req, res) => {
  try {
    await accIdeTASchema.validate(req.body);

    const { idTA, isApproved, id } = req.body;

    const existingTA = await prisma.tA.findUnique({ where: { idTA } });
    if (!existingTA) {
      return res
        .status(404)
        .json({ success: false, message: "TA tidak ditemukan" });
    }

    const dosenPembimbing = await prisma.dosenPembimbing.findUnique({
      where: { id },
      include: {
        Dosen: true,
      },
    });

    if (!dosenPembimbing) {
      return res
        .status(404)
        .json({ success: false, message: "Dosen tidak ditemukan" });
    }
    const dosen = dosenPembimbing.Dosen;

    if (isApproved && dosen.kuotaMhdBimbingan >= 5) {
      return res
        .status(400)
        .json({ success: false, message: "Dosen sudah mencapai batas maksimal 5 TA yang disetujui" });
    }

    const stat = isApproved ? status.disetujui : status.ditolak;

    const advisorApproval = await prisma.dosenPembimbingTA.update({
      where: {
        idTA_dosenPembimbingID: {
          idTA,
          dosenPembimbingID: id,
        },
      },
      data: {
        status: stat,
      },
    });

    if (!advisorApproval) {
      return res
        .status(404)
        .json({ success: false, message: "Pembimbing tidak ditemukan" });
    }
    const pembimbingCount = await prisma.dosenPembimbingTA.count({
      where: { idTA },
    });

    

    if (pembimbingCount === 1) {
      if (isApproved) {
        const updatedTA = await prisma.tA.update({
          where: { idTA },
          data: {
            status: status.disetujui,
            statusTA: statusTA.ide,
          },
        });
        await prisma.dosen.update({
          where: { idDosen: dosen.idDosen },
          data: {
            kuotaMhdBimbingan: {
              increment: 1,
            },
          },
        });


        await prisma.dosenPembimbingTA.updateMany({
          where: { idTA },
          data: { status: status.diproses },
        });

        return res.status(200).json({
          success: true,
          message: "Ide TA disetujui oleh pembimbing",
          data: updatedTA,
        });
      } else {
        const updatedTA = await prisma.tA.update({
          where: { idTA },
          data: {
            status: status.ditolak,
            statusTA: statusTA.belumAda,
          },
        });



        return res.status(200).json({
          success: true,
          message: "Ide TA ditolak oleh pembimbing",
          data: updatedTA,
        });
      }
    } else if (pembimbingCount === 2) {
      const anyRejected = await prisma.dosenPembimbingTA.findMany({
        where: {
          idTA,
          status: status.ditolak,
        },
      });
      if (anyRejected.length > 0) {
        const updatedTA = await prisma.tA.update({
          where: { idTA },
          data: {
            status: status.ditolak,
            statusTA: statusTA.belumAda,
          },
        });


        return res.status(200).json({
          success: true,
          message: "Ide TA ditolak oleh salah satu atau kedua pembimbing",
          data: updatedTA,
        });
      } else {
        const allApproved = await prisma.dosenPembimbingTA.findMany({
          where: {
            idTA,
            status: status.disetujui,
          },
        });

        if (allApproved.length === 2) {
          const updatedTA = await prisma.tA.update({
            where: { idTA },
            data: {
              status: status.disetujui,
              statusTA: statusTA.ide,
            },
          });
          
          const updateDosenResult = await prisma.dosen.updateMany({
            where: { idDosen: { in: allApproved.map(a => a.dosenPembimbingID) } },
            data: {
              kuotaMhdBimbingan: {
                increment: 1,
              },
            },
          });
    
          console.log("Update Dosen Result:", updateDosenResult);

          return res.status(200).json({
            success: true,
            message: "Ide TA diterima oleh kedua pembimbing",
            data: updatedTA,
          });
        }else {
          return res.status(200).json({
            success: true,
            message: "Persetujuan diterima, menunggu persetujuan dari pembimbing lain",
            data: { status: 'diproses', statusTA: 'belumAda' },
          });
        }
      }
    }
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return res
        .status(400)
        .json({ success: false, message: error.errors.join(", ") });
    }
    console.error("Error approving/rejecting TA idea:", error);
    res
      .status(500)
      .json({ success: false, message: "Kesalahan server: " + error.message });
  }
};

export const accJudulTA = async (req, res) => {
  try {
    await accJudulTASchema.validate(req.body);

    const { idTA, isApproved, id } = req.body;

    const existingTA = await prisma.tA.findUnique({
      where: { idTA },
      include: {
        DosenPembimbingTA: {
          where: { dosenPembimbingID: id },
        },
      },
    });

    if (!existingTA) {
      return res
        .status(404)
        .json({ success: false, message: "TA tidak ditemukan" });
    }

    if (existingTA.DosenPembimbingTA.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Pembimbing tidak ditemukan" });
    }

    const stat = isApproved ? status.disetujui : status.ditolak;

    const advisorApproval = await prisma.dosenPembimbingTA.update({
      where: {
        idTA_dosenPembimbingID: {
          idTA,
          dosenPembimbingID: id,
        },
      },
      data: {
        status: stat,
      },
    });

    const pembimbingCount = await prisma.dosenPembimbingTA.count({
      where: { idTA },
    });

    if (pembimbingCount === 1) {
      if (isApproved) {
        const updatedTA = await prisma.tA.update({
          where: { idTA },
          data: {
            status: status.disetujui,
            statusTA: statusTA.judul,
          },
        });

        await prisma.dosenPembimbingTA.updateMany({
          where: { idTA },
          data: { status: status.diproses },
        });

        return res.status(200).json({
          success: true,
          message: "Judul TA disetujui oleh pembimbing",
          data: updatedTA,
        });
      } else {
        const updatedTA = await prisma.tA.update({
          where: { idTA },
          data: {
            status: status.ditolak,
            statusTA: statusTA.belumAda,
          },
        });

        await prisma.dosenPembimbingTA.updateMany({
          where: { idTA },
          data: { status: status.diproses },
        });

        return res.status(200).json({
          success: true,
          message: "Judul TA ditolak oleh pembimbing",
          data: updatedTA,
        });
      }
    } else if (pembimbingCount === 2) {
      const anyRejected = await prisma.dosenPembimbingTA.findMany({
        where: {
          idTA,
          status: status.ditolak,
        },
      });

      if (anyRejected.length > 0) {
        const updatedTA = await prisma.tA.update({
          where: { idTA },
          data: {
            status: status.ditolak,
            statusTA: statusTA.belumAda,
          },
        });

        await prisma.dosenPembimbingTA.updateMany({
          where: { idTA },
          data: { status: status.belumAda },
        });

        return res.status(200).json({
          success: true,
          message: "Judul TA ditolak oleh salah satu atau kedua pembimbing",
          data: updatedTA,
        });
      } else {
        const allApproved = await prisma.dosenPembimbingTA.findMany({
          where: {
            idTA,
            status: status.disetujui,
          },
        });

        if (allApproved.length === 2) {
          const updatedTA = await prisma.tA.update({
            where: { idTA },
            data: {
              status: status.disetujui,
              statusTA: statusTA.judul,
            },
          });

          await prisma.dosenPembimbingTA.updateMany({
            where: { idTA },
            data: { status: status.diproses },
          });

          return res.status(200).json({
            success: true,
            message: "Judul TA diterima oleh kedua pembimbing",
            data: updatedTA,
          });
        }else {
          return res.status(200).json({
            success: true,
            message: "Persetujuan diterima, menunggu persetujuan dari pembimbing lain",
            data: { status: 'diproses', statusTA: 'belumAda' },
          });
        }
    
      }
    }
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return res
        .status(400)
        .json({ success: false, message: error.errors.join(", ") });
    }
    console.error("Error approving/rejecting TA title:", error);
    res
      .status(500)
      .json({ success: false, message: "Kesalahan server: " + error.message });
  }
};

export const getAllTAMahasiswaByDosPemId = async (req, res) => {
  const { id } = req.params;

  try {
    const advisors = await prisma.dosenPembimbing.findMany({
      where: {
        dosenId: id,
      },
    });
    const advisorIds = advisors.map((advisor) => advisor.id);
    const tAs = await prisma.tA.findMany({
      where: {
        DosenPembimbingTA: {
          some: {
            dosenPembimbingID: {
              in: advisorIds,
            },
          },
        },
      },
      include: {
        DosenPembimbingTA: {
          include: {
            DosenPembimbing: true,
          },
        },
        Mahasiswa: true,
        Bidang: true,
      },
    });

    if (advisorIds.length === 0) {
      return res.status(404).json({
        success: false,
        message: "TA tidak ditemukan",
      });
    }

    if (!tAs) {
      return res.status(404).json({
        success: false,
        message: "TA tidak ditemukan",
      });
    }

    res.status(200).json({
      success: true,
      message: "Berhasil mendapatkan semua TA mahasiswa",
      data: tAs,
    });
  } catch (error) {
    console.error("Error getting TA by dosenId:", error);
    res.status(500).json({
      success: false,
      message: "Kesalahan server: " + error.message,
    });
  }
};

export const getTAdetailByIdMahasiswa = async (req, res) => {
  const { id } = req.params;

  try {
    const taDetail = await prisma.tA.findUnique({
      where: {
        idMahasiswa: id,
      },
      include: {
        DosenPembimbingTA: {
          include: {
            DosenPembimbing: {
              include: {
                Dosen: true,
              },
            },
          },
        },
        Mahasiswa: true,
        Bidang: true,
      },
    });

    console.log(taDetail);
    if (!taDetail) {
      return res.status(404).json({
        success: false,
        message: "TA tidak ditemukan untuk mahasiswa ini",
      });
    }

    res.status(200).json({
      success: true,
      data: taDetail,
    });
  } catch (error) {
    console.error("Error getting TA detail by idMahasiswa:", error);
    res.status(500).json({
      success: false,
      message: "Kesalahan server: " + error.message,
    });
  }
};
