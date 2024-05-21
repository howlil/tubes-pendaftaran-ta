const prisma = require("../../config/db");
const multer = require("multer");
const path = require("path");

exports.getUserById = async (req, res) => {
  try {
    const id = req.user.userId;
    const role = req.user.role;

    let user;
    if (role === "MAHASISWA") {
      user = await prisma.mahasiswa.findUnique({ where: { id } });
    } else if (role === "DOSEN") {
      user = await prisma.dosen.findUnique({ where: { id } });
    } else if (role === "ADMIN") {
      user = await prisma.admin.findUnique({ where: { id } });
    }

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: `${role} tidak ditemukan` });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error(`Error fetching ${role} data:`, error);
    res
      .status(500)
      .json({ success: false, message: "Kesalahan server: " + error.message });
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "foto") {
      cb(null, path.join(__dirname, "../../../public/images/profile"));
    }
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const fileFilter = function (req, file, cb) {
  if (file.fieldname === "foto") {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.mimetype)) {
      const error = new multer.MulterError("LIMIT_UNEXPECTED_FILE");
      error.message = "Jenis File Tidak Diizinkan, Hanya JPEG dan PNG yang Diizinkan";
      return cb(error, false);
    }
  } else {
    cb(new Error("Invalid field name"), false);
  }
  cb(null, true);
};

exports.uploadFoto = multer({ storage: storage, fileFilter: fileFilter }).single("foto");


exports.editUserProfile = async (req, res) => {
  try {
    console.log('File:', req.file); // Debugging file
    console.log('Body:', req.body); // Debugging body
    const id = req.user.userId;
    const role = req.user.role.toLowerCase(); // Menurunkan semua karakter ke huruf kecil untuk konsistensi
    const { nama, email, alamat, noHp } = req.body;
    let nim_nip;

    if (role === 'dosen') {
      nim_nip = req.body.nip;
    } else {
      nim_nip = req.body.nim;
    }

    const user = await prisma[role].findUnique({ where: { id } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Pengguna tidak ditemukan" });
    }

    let foto;
    if (req.file) {
      foto = req.file.filename;
    }

    const updateData = { nama, email, alamat, noHp };
    if (foto) {
      updateData.foto = foto;
    }
    if (role === 'dosen') {
      updateData.nip = nim_nip;
    } else {
      updateData.nim = nim_nip;
    }

    const updatedUser = await prisma[role].update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: "Profil berhasil diperbarui",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res
      .status(500)
      .json({ success: false, message: "Kesalahan server: " + error.message });
  }
};
