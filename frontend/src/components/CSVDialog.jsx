import { FiX } from 'react-icons/fi';
import apiClient from '../services/api';

export default function CSVDialog({ setShowCSVDialog, setShowMessage, setFormStatus, loadCoreData }) {

    const handleCSVSubmit = async (e) => {
        e.preventDefault();

        const fileInput = e.target.querySelector('input[type="file"]');
        if (!fileInput.files.length) {
            alert("Please select a CSV file to upload.");
            return;
        }

        const file = fileInput.files[0];

        const formData = new FormData();
        formData.append("csv", file);

        try {
            const res = await apiClient.post('/import/csv', formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            if (res.status === 200) {
                setShowCSVDialog(false);
                setFormStatus('CSV uploaded successfully');
                setShowMessage(true);

                loadCoreData();
            }

        } catch (err) {
            console.error(err);
            alert("Error uploading CSV: " + (err.response?.data?.message || err.message));
        }
    }

    return (
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div class="bg-white/10 border border-white/20 glass rounded-2xl p-6 w-full max-w-lg space-y-4">

                <div class="flex justify-between items-center">
                    <h2 class="text-xl font-display">Upload CSV File</h2>
                    <button
                        class="p-2 rounded-xl bg-white/10 hover:bg-white/20"
                        onClick={() => setShowCSVDialog(false)}
                    >
                        <FiX />
                    </button>
                </div>

                <p class="text-sm text-gray-300">
                    Upload a CSV file to bulk import data.
                    Supported categories: <strong>Students</strong>, <strong>Courses</strong>,
                    <strong> Departments</strong>, <strong>Semesters</strong>, <strong>Rooms</strong>.
                </p>

                <div class="bg-black/20 border border-white/10 rounded-xl p-4 text-sm space-y-2">
                    <p class="font-semibold text-gray-200">CSV Guidelines:</p>

                    <ul class="list-disc list-inside space-y-1 text-gray-300">
                        <li>File must be in <strong>.csv</strong> format.</li>
                        <li>First row should contain column names.</li>
                        <li>Do not leave empty rows.</li>
                        <li>Encoding should be <strong>UTF-8</strong>.</li>
                    </ul>

                    <p class="font-semibold text-gray-200 pt-2">Download the below csv file for template:</p>
                    <p class="text-sm text-gray-300">
                        <a
                            href="/sample_bulk_data.csv"
                            download="template_bulk_data.csv"
                            className="underline hover:text-white cursor-pointer"
                        >
                            Download...
                        </a>
                    </p>

                </div>

                <form class="space-y-4" onSubmit={handleCSVSubmit}>
                    <input
                        type="file"
                        accept=".csv"
                        required
                        class="block w-full text-sm text-gray-200 
                           bg-white/5 border border-white/10 rounded-xl file:bg-white/10 
                           file:border-none file:px-3 file:py-2 file:rounded-xl cursor-pointer hover:file:bg-white/20"
                    />

                    <button
                        type="submit"
                        class="w-full py-2 rounded-2xl bg-brand-500/20 border border-brand-500/40"
                    >
                        Upload CSV
                    </button>
                </form>

            </div>
        </div>
    );
}