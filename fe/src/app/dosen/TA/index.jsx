import React, { useEffect, useState } from "react";
import Layout from "@/components/other/layout";
import Tables from "@/components/ui/Table";
import getAllTAMahasiswaByDosPemId from "@/apis/dosen/TA/getAllTAMhs";
import { getDataFromToken } from "@/utils/getDataToken";
import { useNavigate } from "react-router-dom";

export default function HandleTA() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const id = getDataFromToken()?.userId;
  const [status, setStatus] = useState({ status: "", statusTA: "" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getAllTAMahasiswaByDosPemId(id);
        if (response?.success) {
          setData(response?.data);
          response.data.map((data) => {
            setStatus({
              status: data?.status,
              statusTA: data?.statusTA,
            });
          })
        
        } else {
          setError(response.message);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);
  const handleEdit = (row) => {
    {
      console.log(row);
      const id = row.idMahasiswa;
      navigate(`/dosen/detailTA/${id}`);
    }
  };

  const columns = [
    {
      header: "Nama",
      accessor: "Mahasiswa.nama",
    },
    {
      header: "NIM",
      accessor: "Mahasiswa.nim",
    },
    {
      header: "Bidang",
      accessor: "Bidang.namaBidang",
    },
    {
      header: "Status",
      accessor: "status",
    },
  ];

  return (
    <Layout>
      <h1 className="font-bold text-2xl ">Daftar TA Mahasiswa</h1>
      <section className="mt-8">
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p>Error: {error}</p>
        ) : status.status === "disetujui" || status.status === "ditolak" ? (
          <Tables
            columns={columns}
            data={data}
            del="hidden"
            down={"hidden"}
            show={"hidden"}
            edit={"hidden"}
            aksi={"hidden"}
          />
        ) : (
          <Tables
            columns={columns}
            data={data}
            del="hidden"
            down={"hidden"}
            show={"hidden"}
            onEdit={(row) => handleEdit(row)}
          />
        )}
      </section>
    </Layout>
  );
}
