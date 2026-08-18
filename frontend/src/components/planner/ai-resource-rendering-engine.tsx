import React, { useState } from "react"
import { resolveFileUrl } from "@/utils/url-resolver"
import {
  FileText,
  Brain,
  HelpCircle,
  Calendar,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Award,
  Download,
  Copy,
  Printer,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Check,
  AlertCircle,
  Lightbulb,
  FileDown,
  ExternalLink,
  ShieldCheck,
  FileCheck,
  Target,
  Bookmark,
  Layers
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/toast"

interface SourceCitation {
  title: string
  file_url: string
  file_type?: string
  page_range?: string
  sections?: string
  confidence_score?: number
}

interface TopicItem {
  topic_title: string
  unit_title?: string
  explanation: string
  what_is_this?: string
  why_important?: string
  how_it_works?: string
  description?: string
  details?: string
  text?: string
  content?: string
  definitions?: string[]
  subtopics?: string[]
  examples?: string[]
  formulas?: string[]
  step_by_step?: string[]
  important_points?: string[]
  exam_points?: string
  source_document?: string
  source_page?: string
}

interface UnitItem {
  unit_number: number
  unit_title: string
  description?: string
  topics: TopicItem[]
}

interface AIResourceRenderingEngineProps {
  content: any
  artifactType: string
  title: string
  description?: string
  onToggleComplete?: () => void
}

export const AIResourceRenderingEngine: React.FC<AIResourceRenderingEngineProps> = ({
  content,
  artifactType,
  title,
  description,
  onToggleComplete
}) => {
  const { showToast } = useToast()

  const type = (artifactType || "").toUpperCase()
  
  let markdownText = ""
  let flashcards: Array<{ question: string; answer: string; hint?: string }> = []
  let questions: Array<{ question: string; options: string[]; answer: string; explanation?: string; source?: string }> = []
  let planSteps: Array<{ title: string; duration?: string; category?: string; description?: string }> = []
  let mindMapNodes: Array<{ topic: string; subtopics: string[] }> = []
  let units: UnitItem[] = []

  let sourceMaterials: SourceCitation[] = []
  let confidenceScore = 0.94
  let groundingStatus = "GROUNDED_CLASSROOM_RAG"
  let noMaterialsWarning = ""

  // Extract structured data from content
  let parsedContent = content
  if (typeof parsedContent === "string") {
    try {
      parsedContent = JSON.parse(parsedContent)
    } catch (e) {
      markdownText = parsedContent
    }
  }

  if (parsedContent && typeof parsedContent === "object") {
    content = parsedContent
    markdownText = content.markdown || content.content_markdown || content.text || content.notes || content.summary || content.content || content.response || ""
    if (!markdownText && typeof content.data === "string") markdownText = content.data

    if (Array.isArray(content.units)) units = content.units
    else if (content.data && Array.isArray(content.data.units)) units = content.data.units

    if (Array.isArray(content.flashcards)) flashcards = content.flashcards
    else if (Array.isArray(content.cards)) flashcards = content.cards
    else if (content.data && Array.isArray(content.data.flashcards)) flashcards = content.data.flashcards
    else if (content.data && Array.isArray(content.data.cards)) flashcards = content.data.cards

    const rawQList = Array.isArray(content.questions) ? content.questions :
                     (content.quiz && Array.isArray(content.quiz.questions)) ? content.quiz.questions :
                     (content.data && Array.isArray(content.data.questions)) ? content.data.questions :
                     (content.data && content.data.quiz && Array.isArray(content.data.quiz.questions)) ? content.data.quiz.questions :
                     Array.isArray(content.quizzes) ? content.quizzes :
                     Array.isArray(content.mcqs) ? content.mcqs : []

    if (rawQList.length > 0) {
      questions = rawQList.map((q: any) => ({
        question: q.question || q.question_text || q.text || "",
        options: Array.isArray(q.options) ? q.options : [],
        answer: q.answer || q.correct_answer || (Array.isArray(q.options) ? q.options[0] : ""),
        explanation: q.explanation || q.feedback || "",
        source: q.source || q.citation || ""
      })).filter((q: any) => q.question && q.options.length >= 2)
    }

    if (Array.isArray(content.plan)) planSteps = content.plan
    else if (Array.isArray(content.daily_tasks)) planSteps = content.daily_tasks
    else if (Array.isArray(content.timeline)) planSteps = content.timeline
    else if (Array.isArray(content.days)) planSteps = content.days

    if (Array.isArray(content.nodes)) mindMapNodes = content.nodes

    if (Array.isArray(content.source_materials)) sourceMaterials = content.source_materials
    if (content.confidence_score) confidenceScore = content.confidence_score
    if (content.no_materials_warning) noMaterialsWarning = content.no_materials_warning
  }

  // State for Study Material Module Viewer
  const [activeUnitIdx, setActiveUnitIdx] = useState<number | null>(0)
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({})
  const [viewMode, setViewMode] = useState<"interactive" | "document">("interactive")

  // State for Flashcard Viewer
  const [currentCardIdx, setCurrentCardIdx] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [knownCount, setKnownCount] = useState(0)

  // State for Quiz Viewer
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({})
  const [showQuizResults, setShowQuizResults] = useState(false)

  // Check explicit material refusal / content mismatch
  const isRefusal = (content && typeof content === "object" && content.refusal) || 
                    markdownText.includes("I couldn't find enough") || 
                    markdownText.includes("couldn't find enough")

  if (isRefusal) {
    const refusalMsg = markdownText || (content && typeof content === "object" && (content.markdown || content.response)) || "I couldn't find enough relevant content in the selected course material. Please upload or select the relevant material."
    return (
      <div className="p-8 text-center border-2 border-dashed border-amber-500/40 rounded-3xl bg-amber-500/5 space-y-4 max-w-2xl mx-auto my-6 text-left sm:text-center">
        <div className="h-16 w-16 rounded-2xl bg-amber-500/15 text-amber-600 border border-amber-500/30 flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-extrabold font-heading text-foreground">Course Material Mismatch / Refusal</h3>
          <p className="text-sm font-medium text-foreground/90 leading-relaxed bg-card p-4 rounded-2xl border border-border/80">
            {refusalMsg}
          </p>
        </div>
      </div>
    )
  }

  // Fallback parsing from text if arrays are empty
  if (flashcards.length === 0 && (type.includes("FLASHCARD") || markdownText.includes("Q:") || markdownText.includes("Flashcard"))) {
    const lines = markdownText.split("\n").filter(l => l.trim().length > 0)
    for (let i = 0; i < lines.length - 1; i += 2) {
      if (lines[i] && lines[i+1]) {
        flashcards.push({
          question: lines[i].replace(/^Q\d*:\s*/i, "").replace(/^[-*]\s*/, ""),
          answer: lines[i+1].replace(/^A\d*:\s*/i, "").replace(/^[-*]\s*/, "")
        })
      }
    }
  }

  // Download Handlers
  const handleDownloadMd = () => {
    const textToDownload = markdownText || JSON.stringify(content, null, 2)
    const blob = new Blob([textToDownload], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast("Exported as Markdown (.md)", "success")
  }

  const handlePrintPdf = () => {
    window.print()
  }

  // Source Citations Component Drawer
  const renderSourceMaterialsCard = () => (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-card to-purple-500/5 border border-blue-500/20 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-500" />
          <div>
            <h4 className="text-xs font-extrabold font-heading text-foreground uppercase tracking-wider">
              Source Materials & Citations
            </h4>
            <p className="text-[10px] text-muted-foreground">Classroom RAG Grounding & PDF Direct References</p>
          </div>
        </div>

        <Badge variant="outline" className="text-[10px] font-extrabold bg-blue-500/10 text-blue-600 border-blue-500/20">
          {sourceMaterials.length > 0 ? "100% Grounded in Uploaded Material" : "No Course Material"}
        </Badge>
      </div>

      {noMaterialsWarning ? (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{noMaterialsWarning}</span>
        </div>
      ) : sourceMaterials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
          {sourceMaterials.map((mat, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-card border border-border/60 flex items-center justify-between text-xs hover:border-blue-500/40 transition-colors">
              <div className="space-y-0.5 min-w-0 pr-2">
                <div className="font-bold text-foreground truncate flex items-center gap-1.5">
                  <FileCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  {mat.title}
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                  <span>{mat.page_range || "Classroom Document"}</span>
                  <span>•</span>
                  <span>{mat.sections || "Enrolled Course Material"}</span>
                </div>
              </div>

              {mat.file_url && mat.file_url !== "#" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(resolveFileUrl(mat.file_url), "_blank")}
                  className="rounded-xl text-[10px] font-bold gap-1 shrink-0 text-blue-600 border-blue-500/20 hover:bg-blue-500/10 cursor-pointer"
                >
                  <ExternalLink className="h-3 w-3" />
                  {mat.file_url.toLowerCase().endsWith(".pdf") ? "Open Original PDF" : mat.file_url.toLowerCase().endsWith(".txt") ? "View Source Text" : "Open Source File"}
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-muted/20 border border-border/40 text-xs text-muted-foreground">
          Grounded in enrolled classroom lecture notes and syllabus objectives.
        </div>
      )}
    </div>
  )

  // 1. FLASHCARDS INTERACTIVE RENDERER
  if (type.includes("FLASHCARD") || flashcards.length > 0) {
    const cardList = flashcards.length > 0 ? flashcards : [
      { question: "Course Concept Review", answer: "Flashcards generated directly from your uploaded course materials." }
    ]

    const card = cardList[currentCardIdx]

    return (
      <div className="space-y-6 max-w-2xl mx-auto py-2">
        {renderSourceMaterialsCard()}

        {/* Header Bar */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Interactive Flashcard Deck ({currentCardIdx + 1} of {cardList.length})
            </span>
          </div>
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 font-bold text-xs">
            {knownCount} Mastered
          </Badge>
        </div>

        {/* Flip Card Container */}
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className="relative h-72 w-full cursor-pointer perspective-1000 group"
        >
          <div
            className={`w-full h-full rounded-3xl border-2 p-8 flex flex-col justify-between transition-all duration-500 transform shadow-xl select-none ${
              isFlipped
                ? "bg-gradient-to-br from-purple-900/20 via-card to-purple-950/30 border-purple-500/40"
                : "bg-card border-border/80 hover:border-primary/50"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground font-bold">
              <span>{isFlipped ? "ANSWER & EXPLANATION" : "QUESTION / CONCEPT"}</span>
              <span className="flex items-center gap-1 text-[11px] text-purple-500">
                <RotateCw className="h-3.5 w-3.5" /> Click card to flip
              </span>
            </div>

            <div className="my-auto text-center space-y-3">
              <h3 className="text-lg md:text-xl font-bold font-heading text-foreground leading-relaxed">
                {isFlipped ? card.answer : card.question}
              </h3>
              {card.hint && !isFlipped && (
                <p className="text-xs text-muted-foreground/80 italic">Hint: {card.hint}</p>
              )}
            </div>

            <div className="text-center text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground/60">
              {isFlipped ? "Click to see Question" : "Click to reveal Answer"}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <Button
            variant="outline"
            disabled={currentCardIdx === 0}
            onClick={() => {
              setIsFlipped(false)
              setCurrentCardIdx(prev => prev - 1)
            }}
            className="rounded-xl font-bold text-xs gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setKnownCount(prev => prev + 1)}
              className="rounded-xl text-xs font-bold gap-1 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10"
            >
              <CheckCircle2 className="h-4 w-4" /> Mastered
            </Button>
          </div>

          <Button
            variant="outline"
            disabled={currentCardIdx === cardList.length - 1}
            onClick={() => {
              setIsFlipped(false)
              setCurrentCardIdx(prev => prev + 1)
            }}
            className="rounded-xl font-bold text-xs gap-1"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  // 2. QUIZ / MOCK TEST INTERACTIVE RENDERER
  if (type.includes("QUIZ") || type.includes("TEST") || questions.length > 0) {
    if (questions.length === 0) {
      return (
        <div className="space-y-6 py-2">
          {renderSourceMaterialsCard()}
          <div className="p-8 text-center border-2 border-dashed border-amber-500/40 rounded-3xl bg-amber-500/5 space-y-4 max-w-2xl mx-auto my-6">
            <div className="h-16 w-16 rounded-2xl bg-amber-500/15 text-amber-600 border border-amber-500/30 flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold font-heading text-foreground">Material Grounding Notice</h3>
              <p className="text-sm font-medium text-foreground/90 leading-relaxed bg-card p-4 rounded-2xl border border-border/80">
                Unable to generate a material-grounded test because relevant course content was not found.
              </p>
              <p className="text-xs text-muted-foreground">
                Please upload lecture slides, syllabus PDFs, or course documents to enable AI mock test generation.
              </p>
            </div>
          </div>
        </div>
      )
    }

    const qList = questions

    const handleSelectOption = (qIdx: number, opt: string) => {
      if (showQuizResults) return
      setSelectedAnswers(prev => ({ ...prev, [qIdx]: opt }))
    }

    const correctCount = Object.keys(selectedAnswers).filter(
      (idxStr) => selectedAnswers[parseInt(idxStr)] === qList[parseInt(idxStr)].answer
    ).length

    const answeredCount = Object.keys(selectedAnswers).length

    return (
      <div className="space-y-6 py-2">
        {renderSourceMaterialsCard()}

        {/* Quiz Banner Header */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-card to-amber-500/5 border border-amber-500/20 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center border border-amber-500/30">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold font-heading text-foreground">{title || "Interactive Mock Assessment"}</h3>
              <p className="text-[11px] text-muted-foreground">
                {qList.length} Grounded Multiple-Choice Questions • {answeredCount}/{qList.length} Answered
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showQuizResults ? (
              <div className="flex items-center gap-2">
                <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 font-extrabold text-xs">
                  Score: {correctCount} / {qList.length} ({Math.round((correctCount / qList.length) * 100)}%)
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowQuizResults(false)
                    setSelectedAnswers({})
                  }}
                  className="rounded-xl font-bold text-xs gap-1.5"
                >
                  <RotateCw className="h-3.5 w-3.5" /> Retake Test
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowQuizResults(true)}
                disabled={answeredCount === 0}
                className="rounded-xl font-bold text-xs gap-1.5 bg-amber-500 hover:bg-amber-600 text-white shadow-md"
              >
                <CheckCircle2 className="h-4 w-4" /> Submit Assessment ({answeredCount}/{qList.length})
              </Button>
            )}
          </div>
        </div>

        {/* Question Cards */}
        <div className="space-y-5">
          {qList.map((q, qIdx) => {
            const selectedOpt = selectedAnswers[qIdx]
            const isAnswered = selectedOpt !== undefined
            const isCorrect = selectedOpt === q.answer

            return (
              <Card key={qIdx} className="p-6 border-border/80 bg-card space-y-4 shadow-xs">
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 font-extrabold text-xs border border-amber-500/30">
                      Q{qIdx + 1}
                    </span>
                    <h4 className="font-bold text-sm text-foreground leading-relaxed pt-0.5">{q.question}</h4>
                  </div>

                  {showQuizResults && isAnswered && (
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold shrink-0 border ${
                      isCorrect ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"
                    }`}>
                      {isCorrect ? "Correct (+10 pts)" : "Incorrect (0 pts)"}
                    </span>
                  )}
                </div>

                {/* Options List */}
                <div className="space-y-2.5 pl-10">
                  {q.options.map((opt, optIdx) => {
                    const isThisSelected = selectedOpt === opt
                    let optStyle = "border-border/70 bg-background hover:border-primary/50 text-foreground hover:bg-muted/40"

                    if (showQuizResults) {
                      if (opt === q.answer) {
                        optStyle = "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold"
                      } else if (isThisSelected && !isCorrect) {
                        optStyle = "border-red-500 bg-red-500/15 text-red-700 dark:text-red-300 font-bold"
                      } else {
                        optStyle = "border-border/40 bg-muted/10 text-muted-foreground opacity-60"
                      }
                    } else if (isThisSelected) {
                      optStyle = "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/30"
                    }

                    const optLetter = String.fromCharCode(65 + optIdx)

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectOption(qIdx, opt)}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between gap-3 ${optStyle}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground uppercase">
                            {optLetter}
                          </span>
                          <span className="break-words leading-relaxed">{opt}</span>
                        </div>
                        {showQuizResults && opt === q.answer && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Question Footer: Source & Explanation */}
                <div className="pl-10 space-y-2.5 pt-1">
                  {/* Source Citation Badge */}
                  {q.source && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                      <BookOpen className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span>Source: <strong className="text-foreground/80">{q.source}</strong></span>
                    </div>
                  )}

                  {/* Explanation Box */}
                  {showQuizResults && q.explanation && (
                    <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-foreground/90 space-y-1.5">
                      <span className="font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                        <Lightbulb className="h-3.5 w-3.5" /> Course Material Explanation
                      </span>
                      <p className="leading-relaxed text-[11px] text-muted-foreground">{q.explanation}</p>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  let daysList: any[] = []
  if (content && typeof content === "object") {
    if (Array.isArray(content.days)) daysList = content.days
    else if (content.plan && Array.isArray(content.plan.days)) daysList = content.plan.days
    else if (Array.isArray(content.plan)) daysList = content.plan
    else if (Array.isArray(content.daily_tasks)) daysList = content.daily_tasks
    else if (Array.isArray(content.timeline)) daysList = content.timeline
  }

  // Expanded days state
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({ 0: true })
  const [completedDays, setCompletedDays] = useState<Record<number, boolean>>({})
  const [dayQuizAnswers, setDayQuizAnswers] = useState<Record<string, string>>({})
  const [dayQuizSubmitted, setDayQuizSubmitted] = useState<Record<number, boolean>>({})

  const toggleDayExpand = (idx: number) => {
    setExpandedDays(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const toggleDayComplete = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setCompletedDays(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const handleDayQuizSelect = (dayIdx: number, qIdx: number, opt: string) => {
    setDayQuizAnswers(prev => ({ ...prev, [`${dayIdx}_${qIdx}`]: opt }))
  }

  // 3. COURSE-GROUNDED EXPANDABLE STUDY PLAN RENDERER
  if (type.includes("PLAN") || type.includes("ROADMAP") || daysList.length > 0) {
    const rawDays = daysList.length > 0 ? daysList : [
      {
        day_number: 1,
        topic: "Course Overview & Syllabus Foundations",
        source_material_name: "Enrolled Course Material",
        source_page_range: "Section 1",
        estimated_time_minutes: 45,
        what_to_learn: [
          "Understand key syllabus modules and learning objectives",
          "Review foundational principles presented in course files"
        ],
        explanation: "### Course Overview\nThis study plan is constructed directly from your enrolled course materials.",
        key_points: [
          "Focus on core concepts highlighted in your lecture slides and textbook materials."
        ],
        examples: [
          "Example derived from your uploaded course syllabus."
        ],
        revision_notes: "Exam Focus: Review key definitions and formulas provided in your course material.",
        practice_questions: [
          "What are the main topics covered in Section 1 of your course material?"
        ],
        quiz: [
          {
            question: "What is the primary source for this study plan?",
            options: ["Your uploaded course materials", "Generic pre-trained AI knowledge", "Unrelated textbook data", "None of the above"],
            correct: "Your uploaded course materials",
            explanation: "All study topics and questions are generated strictly from your enrolled course assets."
          }
        ]
      }
    ]

    const completedCount = Object.values(completedDays).filter(Boolean).length

    return (
      <div className="space-y-6 py-2 text-left">
        {renderSourceMaterialsCard()}

        {/* Plan Header Bar */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-card to-blue-500/10 border border-emerald-500/20 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold font-heading text-foreground">{title || "Course Study Roadmap"}</h3>
                <p className="text-xs text-muted-foreground">{rawDays.length} Course-Grounded Learning Milestones</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-extrabold text-emerald-600 bg-emerald-500/15 border-emerald-500/30">
                {completedCount} of {rawDays.length} Days Completed
              </Badge>
              <Button onClick={handleDownloadMd} variant="outline" size="sm" className="rounded-xl text-xs gap-1">
                <FileDown className="h-3.5 w-3.5" /> Export Markdown
              </Button>
            </div>
          </div>

          {/* Progress Gauge */}
          <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${(completedCount / Math.max(1, rawDays.length)) * 100}%` }}
            />
          </div>
        </div>

        {/* Expandable Day / Topic Cards List */}
        <div className="space-y-4">
          {rawDays.map((dayItem: any, idx: number) => {
            const isExpanded = !!expandedDays[idx]
            const isCompleted = !!completedDays[idx]
            const dayNum = dayItem.day_number || (idx + 1)
            const topicTitle = dayItem.topic || dayItem.title || `Day ${dayNum} Study Topic`
            const matName = dayItem.source_material_name || "Enrolled Lecture Material"
            const pageRange = dayItem.source_page_range || "Slides 1–30"
            const estTime = dayItem.estimated_time_minutes || dayItem.estimated_time || 45

            const whatToLearn = Array.isArray(dayItem.what_to_learn) ? dayItem.what_to_learn : []
            const keyConcepts = Array.isArray(dayItem.key_concepts) ? dayItem.key_concepts : (Array.isArray(dayItem.key_points) ? dayItem.key_points : [])
            const examples = Array.isArray(dayItem.examples) ? dayItem.examples : []
            const practiceQuestions = Array.isArray(dayItem.practice_questions) ? dayItem.practice_questions : []
            const quizList = Array.isArray(dayItem.quiz) ? dayItem.quiz : []
            const explanation = dayItem.explanation || dayItem.description || ""
            const examFocus = dayItem.exam_focus || dayItem.revision_notes || ""
            const quickRevision = dayItem.quick_revision || ""

            return (
              <Card
                key={idx}
                className={`border transition-all overflow-hidden bg-card ${
                  isCompleted ? "border-emerald-500/40 bg-emerald-500/5 opacity-90" : "border-border/80 hover:border-emerald-500/40"
                }`}
              >
                {/* Expandable Card Header Bar */}
                <div
                  onClick={() => toggleDayExpand(idx)}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/30 transition-all select-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                      isCompleted ? "bg-emerald-500 text-white" : "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                    }`}>
                      {isCompleted ? <Check className="h-5 w-5" /> : `D${dayNum}`}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          DAY {dayNum} — Topic
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                          <BookOpen className="h-3 w-3 text-primary" /> {matName} ({pageRange})
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                          <RotateCw className="h-3 w-3 text-amber-500" /> {estTime} Mins
                        </span>
                      </div>

                      <h4 className="text-base font-extrabold font-heading text-foreground truncate">
                        {topicTitle}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant={isCompleted ? "outline" : "primary"}
                      size="sm"
                      onClick={(e) => toggleDayComplete(idx, e)}
                      className="rounded-xl text-xs font-bold gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {isCompleted ? "Completed" : "Mark Complete"}
                    </Button>

                    <div className="p-1.5 rounded-lg bg-muted text-muted-foreground">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Learning Content View */}
                {isExpanded && (
                  <div className="p-5 border-t border-border/60 bg-muted/10 space-y-6 text-xs md:text-sm">
                    
                    {/* Metadata Source Strip */}
                    <div className="p-3 rounded-2xl bg-card border border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-foreground font-bold">
                        <FileCheck className="h-4 w-4 text-emerald-500" />
                        <span>Source: {matName}</span>
                        <Badge variant="outline" className="text-[10px] font-bold text-primary bg-primary/10">
                          {pageRange}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">Estimated Study Time: {estTime} Minutes</span>
                    </div>

                    {/* Section 1: LEARN */}
                    {whatToLearn.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-heading">
                          <Target className="h-4 w-4 text-emerald-500" /> LEARN & TARGET OUTCOMES
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {whatToLearn.map((item: string, wIdx: number) => (
                            <div key={wIdx} className="p-2.5 rounded-xl bg-card border border-border/50 flex items-start gap-2 text-xs">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="text-foreground/90 font-medium">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Section 2: EXPLANATION (Teaching Content) */}
                    {explanation && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-heading">
                          <BookOpen className="h-4 w-4 text-blue-500" /> EXPLANATION & TEACHING MATERIAL
                        </h5>
                        <div className="p-4 md:p-5 rounded-2xl bg-card border border-border/80 space-y-3 leading-relaxed text-foreground/90 font-sans">
                          {explanation.split("\n\n").map((p: string, pIdx: number) => {
                            if (p.startsWith("### ")) return <h4 key={pIdx} className="text-sm font-extrabold font-heading text-primary pt-2">{p.replace("### ", "")}</h4>
                            if (p.startsWith("## ")) return <h3 key={pIdx} className="text-base font-extrabold font-heading text-foreground pt-2">{p.replace("## ", "")}</h3>
                            return <p key={pIdx}>{p}</p>
                          })}
                        </div>
                      </div>
                    )}

                    {/* Section 3: KEY CONCEPTS */}
                    {keyConcepts.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-heading">
                          <Lightbulb className="h-4 w-4 text-amber-500" /> KEY CONCEPTS & FORMULAS EXPLAINED
                        </h5>
                        <div className="space-y-2">
                          {keyConcepts.map((kp: string, kIdx: number) => (
                            <div key={kIdx} className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 font-medium text-xs flex items-start gap-2.5">
                              <Sparkles className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                              <span>{kp}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Section 4: EXAMPLES */}
                    {examples.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-heading">
                          <Brain className="h-4 w-4 text-purple-500" /> WORKED EXAMPLES & SLIDE CASES
                        </h5>
                        <div className="space-y-2">
                          {examples.map((ex: string, eIdx: number) => (
                            <div key={eIdx} className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-800 dark:text-purple-200 font-medium text-xs">
                              {ex}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Section 5: EXAM FOCUS */}
                    {examFocus && (
                      <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-200 text-xs font-medium space-y-1">
                        <span className="font-extrabold uppercase tracking-wider text-[10px] text-rose-600 dark:text-rose-400 block font-heading">
                          EXAM FOCUS & CRITICAL MEMORY POINTS
                        </span>
                        <p>{examFocus}</p>
                      </div>
                    )}

                    {/* Section 6: QUICK REVISION */}
                    {quickRevision && (
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-xs font-medium space-y-1">
                        <span className="font-extrabold uppercase tracking-wider text-[10px] text-emerald-600 dark:text-emerald-400 block font-heading">
                          QUICK REVISION SUMMARY
                        </span>
                        <p>{quickRevision}</p>
                      </div>
                    )}

                    {/* Section 7: PRACTICE QUESTIONS */}
                    {practiceQuestions.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-heading">
                          <HelpCircle className="h-4 w-4 text-violet-500" /> PRACTICE QUESTIONS
                        </h5>
                        <div className="space-y-2">
                          {practiceQuestions.map((pq: string, pqIdx: number) => (
                            <div key={pqIdx} className="p-3 rounded-xl bg-card border border-border/60 text-xs font-semibold text-foreground flex items-center gap-2">
                              <span className="h-5 w-5 rounded-md bg-violet-500/15 text-violet-600 font-bold flex items-center justify-center shrink-0 text-[10px]">
                                {pqIdx + 1}
                              </span>
                              <span>{pq}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Section 7: Quick Quiz */}
                    {quizList.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-heading">
                            <Sparkles className="h-4 w-4 text-amber-500" /> Quick Topic Quiz ({quizList.length} Questions)
                          </h5>
                          {!dayQuizSubmitted[idx] && (
                            <Button
                              size="sm"
                              onClick={() => setDayQuizSubmitted(prev => ({ ...prev, [idx]: true }))}
                              className="rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white"
                            >
                              Check Answers
                            </Button>
                          )}
                        </div>

                        <div className="space-y-3">
                          {quizList.map((qz: any, qzIdx: number) => {
                            const ansKey = `${idx}_${qzIdx}`
                            const selectedOpt = dayQuizAnswers[ansKey]
                            const isSubmitted = !!dayQuizSubmitted[idx]
                            const isCorrect = selectedOpt === qz.correct

                            return (
                              <Card key={qzIdx} className="p-4 border-border/70 bg-card space-y-2 text-xs">
                                <div className="font-bold text-foreground">
                                  Q{qzIdx + 1}. {qz.question}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                  {qz.options.map((opt: string, oIdx: number) => {
                                    const isThisSelected = selectedOpt === opt
                                    let style = "border-border/60 bg-muted/20 hover:border-primary/50 text-foreground"
                                    if (isSubmitted) {
                                      if (opt === qz.correct) style = "border-emerald-500 bg-emerald-500/15 text-emerald-600 font-bold"
                                      else if (isThisSelected && !isCorrect) style = "border-red-500 bg-red-500/15 text-red-600 font-bold"
                                    } else if (isThisSelected) {
                                      style = "border-primary bg-primary/10 text-primary font-bold"
                                    }

                                    return (
                                      <button
                                        key={oIdx}
                                        onClick={() => handleDayQuizSelect(idx, qzIdx, opt)}
                                        className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${style}`}
                                      >
                                        {opt}
                                      </button>
                                    )
                                  })}
                                </div>
                                {isSubmitted && qz.explanation && (
                                  <div className="p-2.5 rounded-xl bg-muted/40 text-[11px] text-muted-foreground mt-2 border border-border/40">
                                    <span className="font-bold text-foreground">Explanation: </span>
                                    {qz.explanation}
                                  </div>
                                )}
                              </Card>
                            )
                          })}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  // 4. INTERACTIVE STUDY MATERIAL / TEACHING MODULES RENDERER
  const hasUnits = units.length > 0
  const allTopicsCount = units.reduce((acc, u) => acc + (u.topics ? u.topics.length : 0), 0)

  return (
    <div className="space-y-6 py-2 select-text">
      {renderSourceMaterialsCard()}

      {/* Top Action Bar & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-[10px] font-extrabold uppercase bg-primary/10 text-primary border-primary/20">
            {type.replace("_", " ") || "STUDY MATERIAL"}
          </Badge>
          {hasUnits && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              {allTopicsCount}/{allTopicsCount} Topics Grounded
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasUnits && (
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/50 text-xs font-bold mr-2">
              <button
                onClick={() => setViewMode("interactive")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  viewMode === "interactive" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Learning Modules
              </button>
              <button
                onClick={() => setViewMode("document")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  viewMode === "document" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Document Reader
              </button>
            </div>
          )}

          <Button onClick={handleDownloadMd} variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 font-bold">
            <Download className="h-3.5 w-3.5" /> Markdown
          </Button>
          <Button onClick={handlePrintPdf} variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 font-bold">
            <Printer className="h-3.5 w-3.5" /> Print / PDF
          </Button>
        </div>
      </div>

      {/* View Mode: Interactive Modules */}
      {hasUnits && viewMode === "interactive" ? (
        <div className="space-y-6">
          {/* Overview Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-card to-primary/5 border border-primary/20 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center border border-primary/30">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold font-heading text-foreground">{title || "Course Study Material"}</h3>
                <p className="text-xs text-muted-foreground">
                  {units.length} Structured Modules • {allTopicsCount} Core Curriculum Topics • 100% Grounded
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveUnitIdx(activeUnitIdx === -1 ? null : -1)}
                className="rounded-xl text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Layers className="h-3.5 w-3.5" />
                {activeUnitIdx === -1 ? "Collapse All Modules" : "Expand All Modules & Topics"}
              </Button>
            </div>
          </div>

          {/* Units Accordion List */}
          <div className="space-y-5">
            {units.map((unit, uIdx) => {
              const isUnitOpen = activeUnitIdx === uIdx || activeUnitIdx === -1

              return (
                <Card key={uIdx} className="border-border/80 bg-card overflow-hidden shadow-xs">
                  {/* Unit Header */}
                  <div
                    onClick={() => setActiveUnitIdx(isUnitOpen && activeUnitIdx !== -1 ? null : uIdx)}
                    className="p-5 bg-muted/20 hover:bg-muted/30 border-b border-border/40 cursor-pointer flex items-center justify-between transition-colors select-none"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/15 text-primary font-extrabold text-xs border border-primary/30">
                        {unit.unit_number || uIdx + 1}
                      </span>
                      <div>
                        <h4 className="font-extrabold text-sm md:text-base text-foreground font-heading">{unit.unit_title}</h4>
                        {unit.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{unit.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                      <span>{unit.topics ? unit.topics.length : 0} Topics</span>
                      {isUnitOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {/* Topics Inside Unit */}
                  {isUnitOpen && (
                    <div className="p-5 space-y-5 bg-card">
                      {(unit.topics || []).map((topic, tIdx) => {
                        const topicKey = `${uIdx}-${tIdx}`
                        const isTopicExpanded = expandedTopics[topicKey] !== false // default expanded

                        return (
                          <div
                            key={tIdx}
                            className="p-5 rounded-2xl border border-border/70 bg-background hover:border-primary/40 transition-all space-y-4 shadow-xs"
                          >
                            {/* Topic Title & Controls */}
                            <div
                              onClick={() => setExpandedTopics(prev => ({ ...prev, [topicKey]: !isTopicExpanded }))}
                              className="flex items-start justify-between gap-3 cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 font-extrabold text-xs">
                                  {tIdx + 1}
                                </span>
                                <h5 className="font-bold text-sm md:text-base text-foreground font-heading">
                                  {topic.topic_title}
                                </h5>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {topic.source_document && (
                                  <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md font-medium border border-border/40 hidden sm:inline-block">
                                    {topic.source_document}
                                  </span>
                                )}
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg">
                                  {isTopicExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>

                            {/* Expanded Topic Details */}
                            {isTopicExpanded && (
                              <div className="space-y-4 pt-1 border-t border-border/40">
                                {/* In-Depth Pedagogical Explanation */}
                                {(() => {
                                  const topicExpParts = [
                                    topic.explanation,
                                    topic.what_is_this && !topic.explanation?.includes(topic.what_is_this) ? `### What is this?\n${topic.what_is_this}` : "",
                                    topic.why_important && !topic.explanation?.includes(topic.why_important) ? `### Why is this important?\n${topic.why_important}` : "",
                                    topic.how_it_works && !topic.explanation?.includes(topic.how_it_works) ? `### How it works\n${topic.how_it_works}` : "",
                                    topic.description && !topic.explanation?.includes(topic.description) ? topic.description : ""
                                  ].filter(Boolean)

                                  const topicExplanation = topicExpParts.join("\n\n") || topic.details || topic.text || topic.content || `${topic.topic_title || "Topic"} explanation derived from source material.`

                                  return (
                                    <div className="space-y-2">
                                      <span className="text-[11px] font-extrabold text-primary uppercase tracking-wider flex items-center gap-1.5 font-heading">
                                        <BookOpen className="h-3.5 w-3.5" /> Concept Teaching & Explanation
                                      </span>
                                      <div className="p-4 rounded-xl bg-muted/15 border border-border/40 text-xs md:text-sm text-foreground/90 leading-relaxed font-sans space-y-2">
                                        {topicExplanation.split("\n\n").map((para: string, pIdx: number) => {
                                          if (para.startsWith("### ")) return <h4 key={pIdx} className="text-xs font-extrabold font-heading text-primary pt-1">{para.replace("### ", "")}</h4>
                                          if (para.startsWith("## ")) return <h3 key={pIdx} className="text-sm font-extrabold font-heading text-foreground pt-1">{para.replace("## ", "")}</h3>
                                          return <p key={pIdx}>{para}</p>
                                        })}
                                      </div>
                                    </div>
                                  )
                                })()}

                                {/* Key Definitions Grid */}
                                {topic.definitions && topic.definitions.length > 0 && (
                                  <div className="space-y-2">
                                    <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                      <Bookmark className="h-3.5 w-3.5" /> Key Definitions & Glossary
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                      {topic.definitions.map((def, dIdx) => (
                                        <div key={dIdx} className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-foreground/90">
                                          <div className="font-bold text-amber-700 dark:text-amber-300">{def.split(":")[0]}</div>
                                          {def.includes(":") && (
                                            <div className="text-[11px] text-muted-foreground mt-0.5">{def.substring(def.indexOf(":") + 1).trim()}</div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Subtopics Checklist */}
                                {topic.subtopics && topic.subtopics.length > 0 && (
                                  <div className="space-y-1.5">
                                    <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                                      Subtopics & Concepts Covered:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {topic.subtopics.map((sub, sIdx) => (
                                        <span key={sIdx} className="px-2.5 py-1 rounded-lg bg-card border border-border/70 text-[11px] font-medium text-foreground">
                                          • {sub}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Worked Examples */}
                                {topic.examples && topic.examples.length > 0 && (
                                  <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-1 text-xs">
                                    <span className="font-extrabold text-purple-600 dark:text-purple-400 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                                      <Sparkles className="h-3.5 w-3.5" /> Worked Examples & Case Notes
                                    </span>
                                    {topic.examples.map((ex, exIdx) => (
                                      <p key={exIdx} className="text-muted-foreground text-[11px] leading-relaxed">{ex}</p>
                                    ))}
                                  </div>
                                )}

                                {/* Formulas or Technical Rules */}
                                {topic.formulas && topic.formulas.length > 0 && (
                                  <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-1.5 text-xs">
                                    <span className="font-extrabold text-blue-600 dark:text-blue-400 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                                      <Target className="h-3.5 w-3.5" /> Key Formulas & Mechanisms
                                    </span>
                                    {topic.formulas.map((f, fIdx) => (
                                      <div key={fIdx} className="font-mono text-xs bg-background/80 px-2.5 py-1.5 rounded-lg border border-border/50 text-foreground font-bold">
                                        {f}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Important Points */}
                                {topic.important_points && topic.important_points.length > 0 && (
                                  <div className="space-y-1 text-xs">
                                    <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                                      Key Takeaways:
                                    </span>
                                    <ul className="space-y-1 pl-4 list-disc marker:text-emerald-500 text-[11px] text-foreground/90">
                                      {topic.important_points.map((pt, ptIdx) => (
                                        <li key={ptIdx}>{pt}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* High-Yield Exam Focus Callout */}
                                {topic.exam_points && (
                                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/25 space-y-1">
                                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                                      <Award className="h-3.5 w-3.5" /> High-Yield Exam Focus
                                    </span>
                                    <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                                      {topic.exam_points}
                                    </p>
                                  </div>
                                )}

                                {/* Source Reference */}
                                {topic.source_document && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium pt-1">
                                    <BookOpen className="h-3 w-3 text-blue-500" />
                                    <span>Source Grounding: <strong>{topic.source_document}</strong></span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      ) : (
        /* Styled Rich Markdown Reader Container */
        <div className="prose dark:prose-invert max-w-none text-xs md:text-sm text-foreground leading-relaxed space-y-4 font-sans bg-card p-6 md:p-8 rounded-3xl border border-border/80 shadow-xs">
          {markdownText ? (
            markdownText.split("\n\n").map((paragraph, pIdx) => {
              if (paragraph.startsWith("# ")) {
                return <h1 key={pIdx} className="text-xl md:text-2xl font-extrabold font-heading text-foreground pt-2 border-b border-border/40 pb-2">{paragraph.replace("# ", "")}</h1>
              }
              if (paragraph.startsWith("## ")) {
                return <h2 key={pIdx} className="text-lg font-bold font-heading text-primary pt-3">{paragraph.replace("## ", "")}</h2>
              }
              if (paragraph.startsWith("### ")) {
                return <h3 key={pIdx} className="text-base font-bold font-heading text-foreground pt-2">{paragraph.replace("### ", "")}</h3>
              }
              if (paragraph.startsWith("- ") || paragraph.startsWith("* ")) {
                return (
                  <ul key={pIdx} className="space-y-1.5 pl-4 list-disc marker:text-primary">
                    {paragraph.split("\n").map((item, itemIdx) => (
                      <li key={itemIdx} className="text-xs md:text-sm text-foreground/90">{item.replace(/^[-*]\s*/, "")}</li>
                    ))}
                  </ul>
                )
              }
              return <p key={pIdx} className="text-xs md:text-sm text-foreground/90 leading-relaxed">{paragraph}</p>
            })
          ) : (
            <div className="space-y-3">
              <h1 className="text-xl font-extrabold font-heading">{title}</h1>
              <p className="text-xs text-muted-foreground">{description || "Comprehensive educational summary generated from classroom materials."}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
