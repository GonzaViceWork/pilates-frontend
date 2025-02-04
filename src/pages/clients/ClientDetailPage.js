import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import 'moment/locale/es'; // Importar la configuración regional en español
import "react-big-calendar/lib/css/react-big-calendar.css";
import api from "../../api/axios";

moment.updateLocale('es', {
    week: {
        dow: 1, // Establecer el primer día de la semana en lunes
        doy: 4, // Establecer el día de año que representa el inicio de la primera semana del año
    },
});

const localizer = momentLocalizer(moment);

const ClientDetailPage = () => {
    const navigate = useNavigate();
    const { client_id } = useParams();
    const [client, setClient] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [packages, setPackages] = useState([]);
    const [selectedPackage, setSelectedPackage] = useState("");

    const handleBack = () => {
        navigate(`/clients`);
    };

    const fetchClient = useCallback(async () => {
        try {
            const response = await api.get(`/clients/${client_id}/`);
            setClient(response.data);
        } catch (error) {
            console.error("Error al obtener el cliente:", error);
        }
    }, [client_id]);

    const fetchSessions = useCallback(async () => {
        try {
            const response = await api.get(`/sessions/?client_id=${client_id}`);
            const assignedSessions = response.data.filter(session =>
                session.clients?.includes(parseInt(client_id))  // Verifica si 'client.id' existe
            );
            // console.log(assignedSessions);  // Verifica las sesiones filtradas

            const formattedSessions = assignedSessions.map((session) => {
                // Definir color según estado y asistencia
                let color = "#4A90E2"; // Azul por defecto (pendiente)
                if (session.status === "finished") {
                    color = session.attended_clients.includes(parseInt(client_id)) ? "#5CB85C" : "#D9534F";
                }

                return {
                    ...session,
                    title: `${session.session_type === "group" ? "Sesión Grupal" : "Sesión Privada"} - ${moment(session.date).format("DD-MM-YYYY h:mm A")}`,
                    start: new Date(session.date),
                    end: new Date(moment(session.date).add(1, 'hours')),
                    color: color, // Agregar color como propiedad
                };
            });
            setSessions(formattedSessions);
        } catch (error) {
            console.error("Error al obtener las sesiones:", error);
        }
    }, [client_id]);

    const fetchAttendanceLogs = useCallback(async () => {
        try {
            const response = await api.get(`/clients/${client_id}/attendance_logs/`);
            setAttendanceLogs(response.data);
        } catch (error) {
            console.error("Error al obtener los registros de créditos:", error);
        }
    }, [client_id]);

    const fetchPackages = async () => {
        try {
            const response = await api.get("/packages/");
            setPackages(response.data);
        } catch (error) {
            console.error("Error al obtener los paquetes:", error);
        }
    };

    const handleAddPackage = async () => {
        if (!selectedPackage) {
            alert("Por favor, selecciona un paquete.");
            return;
        }
        try {
            await api.post(`/clients/${client_id}/assign_package/`, {
                package_id: selectedPackage,
            });
            fetchClient();
            fetchAttendanceLogs();
            alert("Paquete asignado correctamente.");
        } catch (error) {
            console.error("Error al asignar el paquete:", error);
        }
    };

    useEffect(() => {
        fetchClient();
        fetchSessions();
        fetchAttendanceLogs();
        fetchPackages();
    }, [fetchClient, fetchSessions, fetchAttendanceLogs]);

    if (!client) {
        return <div style={styles.loading}>Cargando cliente...</div>;
    }

    const events = sessions.map(session => ({
        id: session.id,
        title: `${session.session_type === "group" ? "Sesión Grupal" : "Sesión Privada"} - ${moment(session.date).format("DD-MM-YYYY h:mm A")}`,
        start: new Date(session.date),
        end: new Date(moment(session.date).add(1, 'hours')),
        color: session.color,  // Asegurar que el color se pase
    }));

    // Establecer estilos en el calendario
    const eventStyleGetter = (event) => {
        let backgroundColor = event.color; // Usa el color definido en fetchSessions
        return {
            style: { backgroundColor },
        };
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>
                {client.first_name} {client.last_name}
            </h1>
            <div style={styles.infoContainer}>
                <p><strong>Email:</strong> {client.email}</p>
                <p><strong>Teléfono:</strong> {client.phone}</p>
                <p><strong>CE/DNI:</strong> {client.cn_dni}</p>
                <p><strong>Clases disponibles:</strong> {client.available_slots}</p>
            </div>

            <Link to={`/clients/${client_id}/edit`}>
                <button style={styles.editButton}>Editar Cliente</button>
            </Link>

            <h3 style={styles.sectionTitle}>Calendario de Sesiones</h3>
            <div style={styles.calendarContainer}>
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={styles.calendar}
                    eventPropGetter={eventStyleGetter}
                    firstDayOfWeek={1}
                    messages={{
                        today: "Hoy",
                        previous: "Anterior",
                        next: "Siguiente",
                        month: "Mes",
                        week: "Semana",
                        day: "Día",
                        agenda: "Agenda",
                        date: "Fecha",
                        time: "Hora",
                        event: "Evento",
                    }}
                    onSelectEvent={(event) => {
                        window.location.href = `/calendar/${event.id}/`;
                    }}
                />
            </div>

            <h3 style={styles.sectionTitle}>Registro de Créditos</h3>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th>Acción</th>
                        <th>Clases</th>
                        <th>Descripción</th>
                    </tr>
                </thead>
                <tbody>
                    {attendanceLogs.length > 0 ? (
                        attendanceLogs.map((log) => (
                            <tr key={log.date}>
                                <td>{log.action === "add" ? "Paquete Asignado" : "Clase Asistida"}</td>
                                <td>{log.slots}</td>
                                <td>{log.description}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="4">No hay registros de créditos.</td>
                        </tr>
                    )}
                </tbody>
            </table>

            <h3 style={styles.sectionTitle}>Asignar Paquete</h3>
            <div style={styles.packageContainer}>
                <select
                    value={selectedPackage}
                    onChange={(e) => setSelectedPackage(e.target.value)}
                    style={styles.select}
                >
                    <option value="">Selecciona un paquete</option>
                    {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                            {pkg.name} ({pkg.slot_count} clases)
                        </option>
                    ))}
                </select>
                <button onClick={handleAddPackage} style={styles.assignButton}>Asignar Paquete</button>
            </div>

            <button onClick={handleBack} style={styles.backButton}>Volver</button>
        </div>
    );
};

// 🎨 Estilos en línea
const styles = {
    container: {
        maxWidth: "800px",
        margin: "auto",
        padding: "20px",
        backgroundColor: "#f8f9fa",
        borderRadius: "10px",
        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
        textAlign: "center",
    },
    title: {
        fontSize: "26px",
        marginBottom: "10px",
    },
    infoContainer: {
        marginBottom: "20px",
    },
    sectionTitle: {
        marginTop: "20px",
        fontSize: "20px",
    },
    editButton: {
        padding: "10px",
        backgroundColor: "#007bff",
        color: "white",
        borderRadius: "5px",
        cursor: "pointer",
        marginBottom: "20px",
    },
    calendarContainer: {
        marginBottom: "30px",
    },
    calendar: {
        height: "400px",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        marginTop: "10px",
    },
    packageContainer: {
        display: "flex",
        justifyContent: "center",
        gap: "10px",
    },
    select: {
        padding: "8px",
        borderRadius: "5px",
    },
    assignButton: {
        padding: "10px",
        backgroundColor: "#28a745",
        color: "white",
        borderRadius: "5px",
        cursor: "pointer",
    },
    backButton: {
        padding: "10px",
        backgroundColor: "#6c757d",
        color: "white",
        borderRadius: "5px",
        cursor: "pointer",
        marginTop: "20px",
    },
};

export default ClientDetailPage;