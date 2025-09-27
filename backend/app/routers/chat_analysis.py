"""
Chat-based data analysis router for natural language queries about pastoral data.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
import logging
import json
from datetime import datetime

from app.database import get_db
from app.models import Activity, Registration, Registrant

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat-analysis"])

class ChatMessage(BaseModel):
    question: str
    context: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    data_summary: Optional[Dict[str, Any]] = None
    confidence: float
    timestamp: str

class DataAnalyzer:
    """Analyzes pastoral data and generates natural language responses."""

    def __init__(self, db: Session):
        self.db = db

    def get_data_summary(self) -> Dict[str, Any]:
        """Get a comprehensive summary of the data for context."""

        # Total statistics
        total_registrations = self.db.query(func.count(Registration.id)).scalar()
        total_participants = self.db.query(func.count(Registration.id)).filter(Registration.attended == True).scalar()
        total_people = self.db.query(func.count(func.distinct(Registrant.rut))).filter(Registrant.rut.isnot(None)).scalar()

        # Activities by strategic line
        strategic_stats = self.db.execute(text("""
            SELECT
                a.strategic_line,
                COUNT(DISTINCT a.id) as activities_count,
                COUNT(r.id) as total_registrations,
                SUM(CASE WHEN r.attended = 1 THEN 1 ELSE 0 END) as total_participants,
                COUNT(DISTINCT rg.rut) as unique_people
            FROM activities a
            LEFT JOIN registrations r ON a.id = r.activity_id
            LEFT JOIN registrants rg ON r.registrant_id = rg.id
            WHERE rg.rut IS NOT NULL AND rg.rut != ''
            GROUP BY a.strategic_line
            ORDER BY total_registrations DESC
        """)).fetchall()

        # Popular activities
        popular_activities = self.db.execute(text("""
            SELECT
                a.activity,
                a.strategic_line,
                a.year,
                COUNT(r.id) as registrations,
                SUM(CASE WHEN r.attended = 1 THEN 1 ELSE 0 END) as participants,
                COUNT(DISTINCT rg.rut) as unique_people
            FROM activities a
            LEFT JOIN registrations r ON a.id = r.activity_id
            LEFT JOIN registrants rg ON r.registrant_id = rg.id
            WHERE rg.rut IS NOT NULL AND rg.rut != ''
            GROUP BY a.id, a.activity, a.strategic_line, a.year
            ORDER BY registrations DESC
            LIMIT 10
        """)).fetchall()

        # Yearly trends
        yearly_trends = self.db.execute(text("""
            SELECT
                a.year,
                COUNT(r.id) as registrations,
                SUM(CASE WHEN r.attended = 1 THEN 1 ELSE 0 END) as participants,
                COUNT(DISTINCT rg.rut) as unique_people
            FROM activities a
            LEFT JOIN registrations r ON a.id = r.activity_id
            LEFT JOIN registrants rg ON r.registrant_id = rg.id
            WHERE rg.rut IS NOT NULL AND rg.rut != ''
            GROUP BY a.year
            ORDER BY a.year
        """)).fetchall()

        # Audience distribution
        audience_stats = self.db.execute(text("""
            SELECT
                COALESCE(rg.audience, 'unknown') as audience,
                COUNT(r.id) as registrations,
                SUM(CASE WHEN r.attended = 1 THEN 1 ELSE 0 END) as participants,
                COUNT(DISTINCT rg.rut) as unique_people
            FROM registrations r
            JOIN registrants rg ON r.registrant_id = rg.id
            WHERE rg.rut IS NOT NULL AND rg.rut != ''
            GROUP BY rg.audience
        """)).fetchall()

        return {
            "totals": {
                "registrations": total_registrations,
                "participants": total_participants,
                "unique_people": total_people,
                "conversion_rate": round((total_participants / total_registrations * 100) if total_registrations > 0 else 0, 2)
            },
            "strategic_lines": [
                {
                    "name": row.strategic_line,
                    "activities_count": row.activities_count,
                    "registrations": row.total_registrations,
                    "participants": row.total_participants,
                    "unique_people": row.unique_people
                } for row in strategic_stats
            ],
            "popular_activities": [
                {
                    "name": row.activity,
                    "strategic_line": row.strategic_line,
                    "year": row.year,
                    "registrations": row.registrations,
                    "participants": row.participants,
                    "unique_people": row.unique_people
                } for row in popular_activities
            ],
            "yearly_trends": [
                {
                    "year": row.year,
                    "registrations": row.registrations,
                    "participants": row.participants,
                    "unique_people": row.unique_people
                } for row in yearly_trends
            ],
            "audience_distribution": [
                {
                    "audience": row.audience,
                    "registrations": row.registrations,
                    "participants": row.participants,
                    "unique_people": row.unique_people
                } for row in audience_stats
            ]
        }

    def analyze_question(self, question: str) -> ChatResponse:
        """Analyze a question and generate a natural language response."""

        question_lower = question.lower()
        data_summary = self.get_data_summary()

        # Determine question type and generate appropriate response
        if any(word in question_lower for word in ['persona', 'quien', 'quién', 'individuo', 'participante']):
            return self._answer_person_question(question, data_summary)

        elif any(word in question_lower for word in ['popular', 'más popular', 'mayor', 'top', 'mejores']):
            return self._answer_popularity_question(question, data_summary)

        elif any(word in question_lower for word in ['tendencia', 'evolución', 'año', 'tiempo', 'temporal']):
            return self._answer_trend_question(question, data_summary)

        elif any(word in question_lower for word in ['línea estratégica', 'estratégica', 'líneas']):
            return self._answer_strategic_line_question(question, data_summary)

        elif any(word in question_lower for word in ['estudiantes', 'colaboradores', 'audiencia', 'público']):
            return self._answer_audience_question(question, data_summary)

        elif any(word in question_lower for word in ['total', 'cuántos', 'cuántas', 'cantidad']):
            return self._answer_total_question(question, data_summary)

        elif any(word in question_lower for word in ['asistencia', 'participación', 'participantes']):
            return self._answer_attendance_question(question, data_summary)

        else:
            return self._answer_general_question(question, data_summary)

    def _answer_person_question(self, question: str, data: Dict) -> ChatResponse:
        """Answer questions about individual people and their registration patterns."""

        question_lower = question.lower()

        # Determine if asking about most registrations or specific person
        if any(word in question_lower for word in ['más inscripciones', 'más registros', 'más participaciones', 'más activo']):
            # Query for person with most registrations
            top_people = self.db.execute(text("""
                SELECT
                    rg.full_name,
                    rg.rut,
                    rg.university_email,
                    rg.audience,
                    COUNT(r.id) as total_registrations,
                    SUM(CASE WHEN r.attended = 1 THEN 1 ELSE 0 END) as total_participations,
                    COUNT(DISTINCT a.id) as unique_activities,
                    COUNT(DISTINCT a.strategic_line) as strategic_lines_count,
                    GROUP_CONCAT(DISTINCT a.strategic_line) as strategic_lines
                FROM registrants rg
                JOIN registrations r ON rg.id = r.registrant_id
                JOIN activities a ON r.activity_id = a.id
                WHERE rg.rut IS NOT NULL AND rg.rut != ''
                GROUP BY rg.id, rg.full_name, rg.rut, rg.university_email, rg.audience
                ORDER BY total_registrations DESC
                LIMIT 10
            """)).fetchall()

            if not top_people:
                return ChatResponse(
                    answer="No encontré datos suficientes para determinar quién tiene más inscripciones.",
                    confidence=0.3,
                    timestamp=datetime.utcnow().isoformat()
                )

            top_person = top_people[0]
            participation_rate = (top_person.total_participations / top_person.total_registrations * 100) if top_person.total_registrations > 0 else 0

            answer = f"""**La persona con más inscripciones es:**

**{top_person.full_name}**
- **Total de inscripciones:** {top_person.total_registrations}
- **Participaciones reales:** {top_person.total_participations}
- **Tasa de asistencia:** {participation_rate:.1f}%
- **Actividades únicas:** {top_person.unique_activities}
- **Líneas estratégicas:** {top_person.strategic_lines_count} diferentes
- **Audiencia:** {"Estudiante" if top_person.audience == "estudiantes" else "Colaborador" if top_person.audience == "colaboradores" else "Sin clasificar"}

**Top 5 personas más activas:**
"""

            for i, person in enumerate(top_people[:5], 1):
                rate = (person.total_participations / person.total_registrations * 100) if person.total_registrations > 0 else 0
                answer += f"""{i}. **{person.full_name}** - {person.total_registrations} inscripciones ({rate:.1f}% asistencia)
"""

            return ChatResponse(
                answer=answer,
                data_summary={"top_people": [
                    {
                        "name": p.full_name,
                        "registrations": p.total_registrations,
                        "participations": p.total_participations,
                        "unique_activities": p.unique_activities,
                        "audience": p.audience
                    } for p in top_people[:5]
                ]},
                confidence=0.9,
                timestamp=datetime.utcnow().isoformat()
            )

        else:
            # General question about people
            return ChatResponse(
                answer="""Puedo ayudarte con información sobre personas específicas. Puedes preguntar:

- "¿Quién es la persona que más inscripciones tiene?"
- "¿Quién es la persona más activa?"
- "¿Quién tiene más participaciones?"

¿Qué te gustaría saber específicamente sobre las personas en la base de datos?""",
                confidence=0.6,
                timestamp=datetime.utcnow().isoformat()
            )

    def _answer_popularity_question(self, question: str, data: Dict) -> ChatResponse:
        """Answer questions about popular activities."""

        popular = data["popular_activities"]
        if not popular:
            return ChatResponse(
                answer="No tengo suficientes datos para determinar las actividades más populares.",
                confidence=0.5,
                timestamp=datetime.utcnow().isoformat()
            )

        top_activity = popular[0]

        answer = f"""Basándome en los datos de inscripciones, la actividad más popular es **{top_activity['name']}** """
        answer += f"""de la línea estratégica {top_activity['strategic_line']} ({top_activity['year']}), """
        answer += f"""con {top_activity['registrations']} inscripciones y {top_activity['participants']} participantes reales.

Las 5 actividades más populares son:
"""
        for i, activity in enumerate(popular[:5], 1):
            answer += f"""{i}. **{activity['name']}** ({activity['strategic_line']}, {activity['year']}) - {activity['registrations']} inscripciones
"""

        return ChatResponse(
            answer=answer,
            data_summary={"top_activities": popular[:5]},
            confidence=0.9,
            timestamp=datetime.utcnow().isoformat()
        )

    def _answer_trend_question(self, question: str, data: Dict) -> ChatResponse:
        """Answer questions about trends over time."""

        trends = data["yearly_trends"]
        if len(trends) < 2:
            return ChatResponse(
                answer="Necesito datos de al menos 2 años para analizar tendencias temporales.",
                confidence=0.3,
                timestamp=datetime.utcnow().isoformat()
            )

        # Calculate growth
        first_year = trends[0]
        last_year = trends[-1]

        reg_growth = ((last_year["registrations"] - first_year["registrations"]) / first_year["registrations"] * 100) if first_year["registrations"] > 0 else 0
        people_growth = ((last_year["unique_people"] - first_year["unique_people"]) / first_year["unique_people"] * 100) if first_year["unique_people"] > 0 else 0

        answer = f"""Analizando la evolución temporal desde {first_year['year']} hasta {last_year['year']}:

**Crecimiento en inscripciones:** {reg_growth:+.1f}% (de {first_year['registrations']} a {last_year['registrations']})
**Crecimiento en personas únicas:** {people_growth:+.1f}% (de {first_year['unique_people']} a {last_year['unique_people']})

**Evolución año a año:**
"""

        for trend in trends:
            conversion_rate = (trend["participants"] / trend["registrations"] * 100) if trend["registrations"] > 0 else 0
            answer += f"""- **{trend['year']}:** {trend['registrations']} inscripciones, {trend['participants']} participantes ({conversion_rate:.1f}% asistencia)
"""

        return ChatResponse(
            answer=answer,
            data_summary={"yearly_trends": trends},
            confidence=0.85,
            timestamp=datetime.utcnow().isoformat()
        )

    def _answer_strategic_line_question(self, question: str, data: Dict) -> ChatResponse:
        """Answer questions about strategic lines."""

        strategic = data["strategic_lines"]
        if not strategic:
            return ChatResponse(
                answer="No hay datos disponibles sobre líneas estratégicas.",
                confidence=0.3,
                timestamp=datetime.utcnow().isoformat()
            )

        answer = """**Análisis por Líneas Estratégicas:**

"""

        for line in strategic:
            conversion_rate = (line["participants"] / line["registrations"] * 100) if line["registrations"] > 0 else 0
            answer += f"""**{line['name']}:**
- {line['activities_count']} actividades
- {line['registrations']} inscripciones totales
- {line['participants']} participantes reales
- {line['unique_people']} personas únicas
- {conversion_rate:.1f}% tasa de asistencia

"""

        # Find most successful line
        most_popular = max(strategic, key=lambda x: x["registrations"])
        best_conversion = max(strategic, key=lambda x: (x["participants"] / x["registrations"]) if x["registrations"] > 0 else 0)

        answer += f"""**Insights:**
- La línea con más inscripciones es **{most_popular['name']}**
- La línea con mejor tasa de asistencia es **{best_conversion['name']}**"""

        return ChatResponse(
            answer=answer,
            data_summary={"strategic_lines": strategic},
            confidence=0.9,
            timestamp=datetime.utcnow().isoformat()
        )

    def _answer_audience_question(self, question: str, data: Dict) -> ChatResponse:
        """Answer questions about audience distribution."""

        audience = data["audience_distribution"]
        if not audience:
            return ChatResponse(
                answer="No hay datos disponibles sobre distribución de audiencias.",
                confidence=0.3,
                timestamp=datetime.utcnow().isoformat()
            )

        answer = """**Distribución por Audiencia:**

"""

        total_regs = sum(a["registrations"] for a in audience)
        total_people = sum(a["unique_people"] for a in audience)

        for aud in audience:
            percentage = (aud["registrations"] / total_regs * 100) if total_regs > 0 else 0
            conversion_rate = (aud["participants"] / aud["registrations"] * 100) if aud["registrations"] > 0 else 0

            audience_name = "Estudiantes" if aud["audience"] == "estudiantes" else "Colaboradores" if aud["audience"] == "colaboradores" else "Sin clasificar"

            answer += f"""**{audience_name}:**
- {aud['registrations']} inscripciones ({percentage:.1f}% del total)
- {aud['participants']} participantes
- {aud['unique_people']} personas únicas
- {conversion_rate:.1f}% tasa de asistencia

"""

        return ChatResponse(
            answer=answer,
            data_summary={"audience_distribution": audience},
            confidence=0.85,
            timestamp=datetime.utcnow().isoformat()
        )

    def _answer_total_question(self, question: str, data: Dict) -> ChatResponse:
        """Answer questions about totals."""

        totals = data["totals"]

        answer = f"""**Resumen General de la Pastoral:**

- **Total de inscripciones:** {totals['registrations']:,}
- **Total de participantes:** {totals['participants']:,}
- **Personas únicas alcanzadas:** {totals['unique_people']:,}
- **Tasa de conversión general:** {totals['conversion_rate']}%

Esto significa que en promedio, {totals['conversion_rate']}% de las personas que se inscriben a las actividades efectivamente asisten.
"""

        return ChatResponse(
            answer=answer,
            data_summary={"totals": totals},
            confidence=0.95,
            timestamp=datetime.utcnow().isoformat()
        )

    def _answer_attendance_question(self, question: str, data: Dict) -> ChatResponse:
        """Answer questions about attendance patterns."""

        totals = data["totals"]
        strategic = data["strategic_lines"]

        answer = f"""**Análisis de Asistencia:**

**Tasa general de asistencia:** {totals['conversion_rate']}%
De {totals['registrations']} inscripciones totales, {totals['participants']} personas efectivamente participaron.

**Por línea estratégica:**
"""

        for line in strategic:
            conversion_rate = (line["participants"] / line["registrations"] * 100) if line["registrations"] > 0 else 0
            answer += f"""- **{line['name']}:** {conversion_rate:.1f}% ({line['participants']}/{line['registrations']})
"""

        best_line = max(strategic, key=lambda x: (x["participants"] / x["registrations"]) if x["registrations"] > 0 else 0)
        worst_line = min(strategic, key=lambda x: (x["participants"] / x["registrations"]) if x["registrations"] > 0 else float('inf'))

        answer += f"""
**Insights:**
- La línea con mejor asistencia es **{best_line['name']}**
- Hay oportunidades de mejora en **{worst_line['name']}**
"""

        return ChatResponse(
            answer=answer,
            data_summary={"attendance_analysis": {"strategic_lines": strategic, "totals": totals}},
            confidence=0.85,
            timestamp=datetime.utcnow().isoformat()
        )

    def _answer_general_question(self, question: str, data: Dict) -> ChatResponse:
        """Answer general questions with an overview."""

        totals = data["totals"]
        popular = data["popular_activities"]
        strategic = data["strategic_lines"]

        answer = f"""Te puedo ayudar con información sobre las actividades de la Pastoral. Aquí tienes un resumen general:

**Datos Generales:**
- {totals['registrations']} inscripciones totales
- {totals['participants']} participantes reales
- {totals['unique_people']} personas únicas alcanzadas
- {totals['conversion_rate']}% tasa de asistencia promedio

**Actividad más popular:** {popular[0]['name'] if popular else 'N/A'}
**Líneas estratégicas activas:** {len(strategic)}

Puedes preguntarme sobre:
- Actividades más populares
- Tendencias a lo largo del tiempo
- Análisis por líneas estratégicas
- Distribución de audiencias (estudiantes vs colaboradores)
- Estadísticas de asistencia
- Totales y métricas generales
"""

        return ChatResponse(
            answer=answer,
            data_summary=data,
            confidence=0.7,
            timestamp=datetime.utcnow().isoformat()
        )

@router.post("/ask", response_model=ChatResponse)
async def ask_data_question(
    message: ChatMessage,
    db: Session = Depends(get_db)
):
    """
    Ask a natural language question about the pastoral data.
    """
    try:
        analyzer = DataAnalyzer(db)
        response = analyzer.analyze_question(message.question)

        logger.info(f"Chat question: '{message.question}' - Confidence: {response.confidence}")

        return response

    except Exception as e:
        logger.error(f"Error in chat analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/suggestions")
async def get_question_suggestions():
    """
    Get suggested questions that users can ask.
    """
    suggestions = [
        "¿Cuáles son las actividades más populares?",
        "¿Quién es la persona que más inscripciones tiene?",
        "¿Cómo ha evolucionado la participación a lo largo de los años?",
        "¿Qué línea estratégica tiene mejor asistencia?",
        "¿Cuántas personas únicas han participado en total?",
        "¿Cuál es la distribución entre estudiantes y colaboradores?",
        "¿Cuál es la tasa de asistencia promedio?",
        "¿Qué actividades de Sacramentos son más exitosas?",
        "¿Ha crecido la participación este año comparado con el anterior?",
        "¿Quién es la persona más activa en las actividades?",
        "¿Cuántas actividades de Crecimiento Espiritual hemos tenido?",
        "¿Qué porcentaje de inscritos realmente asiste a las actividades?"
    ]

    return {"suggestions": suggestions}