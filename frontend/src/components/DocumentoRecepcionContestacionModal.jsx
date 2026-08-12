import React, { useState } from 'react';
import { X, Save, FileText, Inbox, User, Calendar, Stethoscope, FileCheck, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { AtendidosService } from '../services/atendidosService';
import { generarPDFRecepcionContestacion } from '../utils/pdfGenerator'; 

const DocumentoRecepcionContestacionModal = ({ isOpen, onClose, item }) => {
  const [loading, setLoading] = useState(false);
  const [generando, setGenerando] = useState(false);

  // Helpers de fecha
  const formatDatetimeLocal = (date) => {
    const d = date ? new Date(date) : new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const formatDateCorta = (date) => {
    const d = date ? new Date(date) : new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const existingData = item?.datos_docs || {};

  // 1. ESTADO PERSISTENTE (BD)
  // Dejamos el nombre del médico aquí porque es un dato del expediente que sí vale la pena conservar
  const [formData, setFormData] = useState({
    medico_nombre: existingData.medico_nombre || 
      (existingData.contra_quien && !existingData.contra_quien.toUpperCase().startsWith('DR') 
        ? `Dr. ${existingData.contra_quien}` 
        : existingData.contra_quien) || 'Dr. '
  });

  // 2. ESTADO EFÍMERO (PDF - No se guarda en BD)
  const [localData, setLocalData] = useState({
    fecha_documento: formatDateCorta(new Date()),
    fecha_hora_audiencia: formatDatetimeLocal(),
    titular_conciliacion: 'AMÉRICA IVONNE GAMEROS ORTIZ',
    auxiliar_conciliacion: 'ROSA GLORIA AGUILAR SARTIAGUÍN',
    anexos_contestacion: 'misma que se ordena agregar a los autos del presente expediente para que surta los efectos legales a que haya lugar.'
  });

  if (!isOpen || !item) return null;

  const handleChangeForm = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleChangeLocal = (e) => {
    const { name, value } = e.target;
    setLocalData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    const toastId = toast.loading('Guardando datos del documento...');
    try {
      await AtendidosService.updateDatosDocs(item.id, formData);
      toast.success('Datos guardados correctamente', { id: toastId });
    } catch (error) {
      console.error("Error guardando datos_docs:", error);
      toast.error('Error al guardar. Verifica tu conexión.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    setGenerando(true);
    const toastId = toast.loading('Guardando y generando Auto de Recepción...');
    
    try {
      // Guardamos solo el nombre del médico por si se corrigió
      await AtendidosService.updateDatosDocs(item.id, formData);

      // Inyectamos todo al vuelo
      const expActualizado = { 
        ...item, 
        datos_docs: { ...existingData, ...formData },
        ...localData 
      };
      
      generarPDFRecepcionContestacion(expActualizado);
      
      toast.success('Auto generado exitosamente', { id: toastId });
    } catch (error) {
      console.error("Error generando PDF:", error);
      toast.error('Error al generar el PDF.', { id: toastId });
    } finally {
      setGenerando(false);
    }
  };

  const handlePreviewPDF = async () => {
    setGenerando(true);
    const toastId = toast.loading('Generando vista previa del Auto de Recepción...');

    try {
      // Inyectamos todo al vuelo
      const expActualizado = {
        ...item,
        datos_docs: { ...existingData, ...formData },
        ...localData
      };
      // Llamamos a la función de generación de PDF con el modo de vista previa
      generarPDFRecepcionContestacion(expActualizado, 'previsualizar');

      toast.success('Vista previa abierta', { id: toastId });
    } catch (error) {
      console.error("Error generando vista previa:", error);
      toast.error('Error al generar la vista previa.', { id: toastId });
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center p-4 sm:p-6 backdrop-blur-sm bg-slate-900/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Inbox size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">Auto de Recepción de Contestación</h2>
              <p className="text-xs font-bold text-slate-400">Expediente: {item.servicio || 'N/A'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
          
          {/* SECCIÓN 1: DATOS DEL DOCUMENTO (EFÍMEROS) */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wider flex items-center gap-2 border-b border-emerald-100 pb-2">
              <Calendar size={16} /> Fechas y Personal (Impresión)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Fecha del Documento (Recepción)</label>
                <input type="date" name="fecha_documento" value={localData.fecha_documento} onChange={handleChangeLocal} className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Fecha y Hora de Audiencia</label>
                <input type="datetime-local" name="fecha_hora_audiencia" value={localData.fecha_hora_audiencia} onChange={handleChangeLocal} className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Titular de Conciliación</label>
                <input type="text" name="titular_conciliacion" value={localData.titular_conciliacion} onChange={handleChangeLocal} className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Auxiliar de Conciliación</label>
                <input type="text" name="auxiliar_conciliacion" value={localData.auxiliar_conciliacion} onChange={handleChangeLocal} className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"/>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: DATOS DEL MÉDICO Y ANEXOS */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Stethoscope size={16} /> Contestación del Médico
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nombre del Prestador del Servicio Médico</label>
                <input type="text" name="medico_nombre" value={formData.medico_nombre} onChange={handleChangeForm} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"/>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Fórmula de Cierre / Anexos Recibidos</label>
                <textarea 
                  name="anexos_contestacion" 
                  value={localData.anexos_contestacion} 
                  onChange={handleChangeLocal} 
                  rows={2}
                  className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">Este texto reemplazará los "---------" al final del documento.</p>
              </div>
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2.5 text-slate-500 hover:bg-slate-200/50 rounded-xl font-bold text-sm transition-colors">
            Cerrar
          </button>
          
          <button 
            onClick={handlePreviewPDF}
            disabled={loading || generando}
            className="px-5 py-2.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 active:scale-95 disabled:opacity-70"
          >
            <Eye size={16} />
            Vista Previa
          </button>

          <button 
            onClick={handleSave}
            disabled={loading || generando}
            className="px-5 py-2.5 bg-slate-800 text-white hover:bg-slate-900 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 active:scale-95 disabled:opacity-70"
          >
            <Save size={16} />
            {loading ? 'Guardando...' : 'Guardar Oficio'}
          </button>

          <button 
            onClick={handleGeneratePDF}
            disabled={loading || generando}
            className="px-6 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-bold text-sm transition-all shadow-md shadow-emerald-200 flex items-center gap-2 active:scale-95 disabled:opacity-70"
          >
            <FileText size={16} />
            {generando ? 'Generando...' : 'Generar PDF Auto Recepción'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default DocumentoRecepcionContestacionModal;