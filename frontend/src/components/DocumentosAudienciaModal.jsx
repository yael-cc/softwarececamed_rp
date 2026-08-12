import React, { useState } from 'react';
import { X, Save, FileText, MapPin, Info, Clock, User, Calendar, Stethoscope, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { AtendidosService } from '../services/atendidosService';
// Importamos la nueva función generadora de PDF (Ajusta la ruta según tu estructura)
import { generarPDFAudienciaInformativa } from '../utils/pdfGenerator'; 

const DocumentosAudienciaModal = ({ isOpen, onClose, item }) => {
  const [loading, setLoading] = useState(false);
  const [generando, setGenerando] = useState(false);

  // Helper para formatear fechas a inputs de tipo fecha
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
  const existingDom = existingData.domicilio || {};

  // 1. ESTADO PARA BASE DE DATOS (Lo que SI se guarda)
  const [formData, setFormData] = useState({
    nombre_oficio: existingData.nombre_oficio || 'OFICIO No. SM/UC/',
    nombre_usuario: existingData.nombre_usuario || `${item?.nombre || ''} ${item?.apellido_paterno || ''} ${item?.apellido_materno || ''}`.trim(),
    
    // Sugerencia dinámica del prefijo Dr.
    medico_nombre: existingData.medico_nombre || 
      (existingData.contra_quien && !existingData.contra_quien.toUpperCase().startsWith('DR') 
        ? `Dr. ${existingData.contra_quien}` 
        : existingData.contra_quien) || 'Dr. ',
    
    fecha_hora_audiencia: existingData.fecha_hora_audiencia || formatDatetimeLocal(),
    
    // El domicilio es un sub-mapa dentro de datos_docs
    domicilio: {
      calle: existingDom.calle || '',
      numero_exterior: existingDom.numero_exterior || '',
      numero_interior: existingDom.numero_interior || '',
      colonia: existingDom.colonia || '',
      municipio: existingDom.municipio || 'TEPIC',
      estado: existingDom.estado || 'NAYARIT'
    }
  });

  // 2. ESTADO EFÍMERO (Lo que NO se guarda en BD, pero sirve para el PDF)
  const [localData, setLocalData] = useState({
    fecha_documento: formatDateCorta(new Date()), // Fecha actual
    fecha_queja: item?.fecha_recepcion ? formatDateCorta(item.fecha_recepcion) : formatDateCorta(new Date()),
    titular_conciliacion: 'AMÉRICA IVONNE GAMEROS ORTIZ'
  });

  if (!isOpen || !item) return null;

  // 3. MANEJADORES DE ESTADO
  const handleChangeForm = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleChangeDomicilio = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      domicilio: { ...prev.domicilio, [name]: value } 
    }));
  };

  const handleChangeLocal = (e) => {
    const { name, value } = e.target;
    setLocalData(prev => ({ ...prev, [name]: value }));
  };

  // 4. GUARDAR EN BACKEND
  const handleSave = async () => {
    setLoading(true);
    const toastId = toast.loading('Guardando datos del oficio...');
    try {
      // Solo enviamos formData (lo persistente)
      await AtendidosService.updateDatosDocs(item.id, formData);
      toast.success('Datos guardados correctamente', { id: toastId });
    } catch (error) {
      console.error("Error guardando datos_docs:", error);
      toast.error('Error al guardar. Verifica tu conexión.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // 5. GENERAR PDF
  const handleGeneratePDF = async () => {
    setGenerando(true);
    const toastId = toast.loading('Guardando datos y generando Oficio...');
    
    try {
      // Primero guardamos en BD
      await AtendidosService.updateDatosDocs(item.id, formData);

      // Preparamos el objeto completo para la función PDF
      // Inyectamos el localData al vuelo para que el PDF lo consuma sin tocar la BD
      const expActualizado = { 
        ...item, 
        datos_docs: formData,
        ...localData // Mandamos la fecha_documento, fecha_queja y titular efímeros
      };
      
      generarPDFAudienciaInformativa(expActualizado);
      
      toast.success('Oficio generado exitosamente', { id: toastId });
    } catch (error) {
      console.error("Error generando PDF:", error);
      toast.error('Error al generar el PDF.', { id: toastId });
    } finally {
      setGenerando(false);
    }
  };

  const handlePreviewPDF = async () => {
    setGenerando(true);
    const toastId = toast.loading('Generando vista previa del PDF...');
    try {
      // Preparamos el objeto completo para la función PDF
      const expActualizado = {
        ...item,
        datos_docs: formData,
        ...localData
      };

      // Llamamos a la función de generación de PDF con el modo de vista previa
      generarPDFAudienciaInformativa(expActualizado, 'previsualizar');

      toast.success('Vista previa abierta', { id: toastId });
    } catch (error) {
      console.error("Error generando vista previa:", error);
      toast.error('Error al generar la vista previa.', { id: toastId });
    } finally {
      setGenerando(false);
    }
  };

  // Para UI: Mostrar el artículo correcto basado en sexo
  const articuloGenero = item?.sexo === 'Femenino' ? 'la' : 'el';

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center p-4 sm:p-6 backdrop-blur-sm bg-slate-900/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-sky-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 text-sky-600 rounded-lg">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">Generación de Audiencia Informativa</h2>
              <p className="text-xs font-bold text-slate-400">Servicio: {item.servicio || 'N/A'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* BODY - FORMULARIO */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
          
          {/* SECCIÓN 1: DATOS DEL OFICIO */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-sky-900 uppercase tracking-wider flex items-center gap-2 border-b border-sky-100 pb-2">
              <Calendar size={16} /> Datos del Oficio y Fechas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nombre del Oficio</label>
                <input type="text" name="nombre_oficio" value={formData.nombre_oficio} onChange={handleChangeForm} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-sky-500 outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Fecha de Emisión</label>
                <input type="date" name="fecha_documento" value={localData.fecha_documento} onChange={handleChangeLocal} className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-sky-500 outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Fecha de la Queja</label>
                <input type="date" name="fecha_queja" value={localData.fecha_queja} onChange={handleChangeLocal} className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-sky-500 outline-none"/>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: DATOS DEL DESTINATARIO (MÉDICO) */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wider flex items-center gap-2 border-b border-indigo-100 pb-2">
              <Stethoscope size={16} /> Destinatario (Médico)
            </h3>
            
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-600 mb-1">Nombre del Médico</label>
              <input type="text" name="medico_nombre" value={formData.medico_nombre} onChange={handleChangeForm} placeholder="Dr. Nombre Apellidos" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"/>
            </div>

            {/* DOMICILIO MAP */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-indigo-700 flex items-center gap-1"><MapPin size={14} /> Domicilio del Médico</h4>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-8">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Calle</label>
                  <input type="text" name="calle" value={formData.domicilio.calle} onChange={handleChangeDomicilio} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"/>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Núm. Ext.</label>
                  <input type="text" name="numero_exterior" value={formData.domicilio.numero_exterior} onChange={handleChangeDomicilio} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"/>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Núm. Int.</label>
                  <input type="text" name="numero_interior" value={formData.domicilio.numero_interior} onChange={handleChangeDomicilio} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"/>
                </div>
                
                <div className="md:col-span-6">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Colonia</label>
                  <input type="text" name="colonia" value={formData.domicilio.colonia} onChange={handleChangeDomicilio} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"/>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Municipio</label>
                  <input type="text" name="municipio" value={formData.domicilio.municipio} onChange={handleChangeDomicilio} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none uppercase"/>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Estado</label>
                  <input type="text" name="estado" value={formData.domicilio.estado} onChange={handleChangeDomicilio} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none uppercase"/>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: CITA Y FIRMAS */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-rose-900 uppercase tracking-wider flex items-center gap-2 border-b border-rose-100 pb-2">
              <User size={16} /> Datos de Audiencia y Partes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nombre del Usuario de Servicio Médico</label>
                  <div className="flex bg-white border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-rose-500 overflow-hidden">
                    <span className="bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-500 border-r border-slate-200 flex items-center">
                      {articuloGenero}
                    </span>
                    <input type="text" name="nombre_usuario" value={formData.nombre_usuario} onChange={handleChangeForm} className="w-full p-2.5 text-sm font-medium outline-none"/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1"><Clock size={12}/> Fecha y Hora de Citatorio de Audiencia</label>
                  <input type="datetime-local" name="fecha_hora_audiencia" value={formData.fecha_hora_audiencia} onChange={handleChangeForm} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none"/>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Titular de Conciliación</label>
                  <input type="text" name="titular_conciliacion" value={localData.titular_conciliacion} onChange={handleChangeLocal} className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none"/>
                </div>
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex gap-2">
                  <Info size={16} className="text-sky-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-sky-800 font-medium leading-relaxed">
                    Los campos marcados en <span className="bg-amber-100 px-1 rounded">amarillo</span> se utilizan para imprimir el documento, pero no sobrescriben la base de datos para mantener el historial.
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* FOOTER - ACCIONES */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2.5 text-slate-500 hover:bg-slate-200/50 rounded-xl font-bold text-sm transition-colors">
            Cerrar
          </button>
          
          <div className="flex items-center gap-3">
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
              className="px-6 py-2.5 bg-sky-600 text-white hover:bg-sky-700 rounded-xl font-bold text-sm transition-all shadow-md shadow-sky-200 flex items-center gap-2 active:scale-95 disabled:opacity-70"
            >
              <FileText size={16} />
              {generando ? 'Generando...' : 'Generar PDF Audiencia'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DocumentosAudienciaModal;