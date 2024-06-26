import React, { useState, useEffect } from "react";
import Layout from "@/components/other/layout";
import getTAdetailByIdMahasiswa from "@/apis/dosen/TA/detailTaMhs";
import accIdeTa from "@/apis/dosen/TA/accIdeTa";
import { useParams, useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import TextArea from "@/components/ui/TextArea";
import { getDataFromToken } from "@/utils/getDataToken";
import StatusTA from "@/components/ui/StatusTA";
import accJudul from "@/apis/dosen/TA/accJudul";
import Toast from "@/components/ui/Toast";

export default function DospemKelolaTA() {
  const { id } = useParams();
  const [taDetail, setTaDetail] = useState(null);
  const [error, setError] = useState(null);
  const [statusAcc, setStatusAcc] = useState("");
  const [idDosPem, setIdDosPem] = useState(null);
  const navigate = useNavigate();
  const dosenId = getDataFromToken()?.userId;
  const [status, setStatus] = useState({ status: "", statusTA: "" });
  const [toast, setToast] = useState({
    isVisible: false,
    message: "",
    isSuccess: true,
  });


  const judul = status.status === "diproses" && status.statusTA === "ide";
  const ide = status.status === "diproses" && status.statusTA === "belumAda";


  useEffect(() => {
    const fetchTADetail = async () => {
      try {
        const response = await getTAdetailByIdMahasiswa(id);
        if (response?.success) {
          setStatus({
            status: response?.data.status,
            statusTA: response?.data.statusTA,
          });
        }
        response.data.DosenPembimbingTA.find((id) => {
          if (id.DosenPembimbing.Dosen.idDosen === dosenId) {
            setIdDosPem(id.dosenPembimbingID);
          }
        });
        if (response?.success) {
          setTaDetail(response?.data);
          setToast({
            isVisible: true,
            message: response?.message,
            isSuccess: false,
          });
        } else {
          setError(response?.message);
          setToast({
            isVisible: true,
            message: response?.message,
            isSuccess: false,
          });
          
        }
      } catch (error) {
        setError("Terjadi kesalahan saat mengambil detail TA");

      }
    };

    fetchTADetail();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const idTA = taDetail.idTA;
    const isApproved = statusAcc === "disetujui" ? true : false;
    const id = idDosPem;
    try {
      if (judul) {
        const response = await accJudul(idTA, isApproved, id);
        if (response?.success) {
          setTaDetail({
            ...taDetail,
            statusTA: response?.data.statusTA,
            status: response?.data.status,
          });
          setToast({
            isVisible: true,
            message: response?.message || "Judul TA berhasil disetujui",
            isSuccess: true,
          });
          setTimeout (() => {
            navigate("/dosen/kelolaTaMahasiswa");
          }, 1000);
        } else {
          setError(response?.message);
        }
      }
      if (ide) {
        const response = await accIdeTa(idTA, isApproved, id);
        console.log(response);
        if (response?.success) {
          setTaDetail({
            ...taDetail,
            statusTA: response?.data.statusTA,
            status: response?.data.status,
          });
          setToast({
            isVisible: true,
            message: response?.message || "Ide TA berhasil disetujui",
            isSuccess: true,
          });
          setTimeout (() => {
            navigate("/dosen/kelolaTaMahasiswa");
          }, 1000);
        } else {
          setError(response?.message);
          setToast({
            isVisible: true,
            message: response?.message,
            isSuccess: false,
          });
        }
      }
    } catch (err) {
      setError("Terjadi kesalahan saat mengubah status TA");
      console.error("Update error:", err);
    }
  };

  if (error) {
    return (
      <Layout>
        <div className="text-red-500">{error}</div>
      </Layout>
    );
  }

  if (!taDetail) {
    return (
      <Layout>
        <div>Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="font-bold text-2xl mb-6">Detail Tugas Akhir Mahasiswa</h1>
      <div className="space-y-4">
        <Input
          label="Nama Mahasiswa"
          value={taDetail.Mahasiswa.nama}
          readOnly
        />

        <Input label="NIM" value={taDetail.Mahasiswa.nim} readOnly />
        <Input label="Bidang" value={taDetail.Bidang.namaBidang} readOnly />
        <TextArea label="Ide Tugas Akhir" value={taDetail.ideTA} readOnly />
        <TextArea
          label="Deskripsi Ide"
          value={taDetail.deskripsiIde}
          readOnly
        />

        {taDetail.judulTA && (
          <TextArea
            label="Judul Tugas Akhir"
            value={taDetail.judulTA}
            readOnly
          />
        )}
        <div className="space-y-3">
          {taDetail.DosenPembimbingTA.map((pembimbing) => (
            <Input
              key={pembimbing.dosenPembimbingID}
              label={`Pembimbing ${pembimbing.DosenPembimbing.tipePembimbing} `}
              value={pembimbing.DosenPembimbing.Dosen.nama}
              readOnly
            />
          ))}
        </div>
        <StatusTA label={taDetail.statusTA} variant={taDetail.statusTA} />
        <form onSubmit={handleSubmit}>
          <Select
            label="Status"
            value={statusAcc}
            onChange={(e) => setStatusAcc(e.target.value)}
            options={[
              { value: "disetujui", label: "Disetujui" },
              { value: "ditolak", label: "Ditolak" },
            ]}
          />
          <div className="flex justify-end">
            <Button custom="mt-8">Simpan</Button>
          </div>
        </form>
        <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
        isSuccess={toast.isSuccess}
      />
      </div>
    </Layout>
  );
}
