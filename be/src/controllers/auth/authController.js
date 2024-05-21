const prisma = require("../../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.buatkAkun = async (req, res) => {
  try {
    const { nama, email, password } = req.body;

    console.log("Request body:", req.body);

    if (!nama || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Isi semua Input" });
    }

    if (!email.endsWith("@admin.com")) {
      return res
        .status(400)
        .json({ success: false, message: "email harus diakhiri @admin.com" });
    }

    const existingUser = await prisma.admin.findUnique({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Akun dengan email ini sudah ada" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.admin.create({
      data: {
        nama,
        email,
        password: hashedPassword,
      },
    });
    const { password: _, ...userData } = user;
    res.status(201).send({ message: "Akun Berhasil dibuat", data: userData });
  } catch (error) {
    res
      .status(400)
      .send({ message: "Eror saat membuat akun", error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Silahkan lengkapi data akun anda" });
    }

    const admin = await prisma.admin.findUnique({ where: { email } });
    const dosen = await prisma.dosen.findUnique({ where: { email } });
    const mahasiswa = await prisma.mahasiswa.findUnique({ where: { email } });

    let user;
    let userType;
    if (admin) {
      user = admin;
      userType = "admin";
    } else if (dosen) {
      user = dosen;
      userType = "dosen";
    } else if (mahasiswa) {
      user = mahasiswa;
      userType = "mahasiswa";
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Akun anda tidak ditemukan" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Password akun anda salah" });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      process.env.ACCESS_SECRET_KEY,
      {
        expiresIn: "1h",
      }
    );

    let tokenData = {
      token,
      expiredAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
    };

    if (userType === "admin") {
      tokenData.adminId = user.id;
    } else if (userType === "dosen") {
      tokenData.dosenId = user.id;
    } else if (userType === "mahasiswa") {
      tokenData.mahasiswaId = user.id;
    }

    await prisma.token.create({
      data: tokenData,
    });

    return res
      .status(200)
      .json({ success: true, message: "Berhasil login", token });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error: " + error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const tokenId = req.tokenId;

    await prisma.token.delete({
      where: {
        id: tokenId,
      },
    });

    res.status(200).json({ success: true, message: "Logout berhasil" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Kesalahan server: " + error.message });
  }
};


exports.ubahPassword = async (req, res) => {
  const { email, oldPassword, newPassword, confirmNewPassword } = req.body;

  if (!email || !oldPassword || !newPassword || !confirmNewPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Isi Semua Inputanya" });
  }



  try {
    const admin = await prisma.admin.findUnique({ where: { email } });
    const dosen = await prisma.dosen.findUnique({ where: { email } });
    const mahasiswa = await prisma.mahasiswa.findUnique({ where: { email } });

    let user;
    let userType;
    if (admin) {
      user = admin;
      userType = "admin";
    } else if (dosen) {
      user = dosen;
      userType = "dosen";
    } else if (mahasiswa) {
      user = mahasiswa;
      userType = "mahasiswa";
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Akun tidak ditemukan" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {``
      return res
        .status(401)
        .json({ success: false, message: "Password Lama Salah" });
    }
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: "Password baru dan konfirmasi password baru tidak cocok",
      });
    }


    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (userType === "admin") {
      await prisma.admin.update({
        where: { email },
        data: { password: hashedPassword },
      });
    } else if (userType === "dosen") {
      await prisma.dosen.update({
        where: { email },
        data: { password: hashedPassword },
      });
    } else if (userType === "mahasiswa") {
      await prisma.mahasiswa.update({
        where: { email },
        data: { password: hashedPassword },
      });
    }

    return res
      .status(200)
      .json({ success: true, message: "Password berhasil di Ubah" });
  } catch (error) {
    console.error("Ubah password error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error: " + error.message });
  }
};
