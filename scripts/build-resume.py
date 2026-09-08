from reportlab.pdfgen import canvas
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.enums import TA_LEFT
from pathlib import Path
out=Path(__file__).resolve().parents[1] / 'output/pdf/Jonathan-Christensen-Agentic-Engineering-Resume.pdf'
out.parent.mkdir(parents=True, exist_ok=True)
c=canvas.Canvas(str(out),pagesize=(612,792));c.setTitle('Jonathan Christensen - Resume');c.setAuthor('Jonathan Christensen');y=751
c.setFont('Times-Bold',25);c.drawCentredString(306,y,'Jonathan Christensen');y-=19
c.setFont('Times-Roman',10);c.drawCentredString(306,y,'San Diego, CA  |  mejohnwc@gmail.com  |  mejohnc.org  |  github.com/mejohnc-ft');y-=26
style=ParagraphStyle('body',fontName='Times-Roman',fontSize=10.2,leading=12.1)
def section(title):
 global y
 c.setFont('Times-Roman',12);c.drawString(36,y,title.upper());y-=5;c.setLineWidth(.5);c.line(36,y,576,y);y-=16

def role(title,date,sub=None):
 global y
 c.setFont('Times-Bold',10.7);c.drawString(46,y,title);c.setFont('Times-Roman',10);c.drawRightString(576,y,date);y-=14
 if sub:c.setFont('Times-Italic',10.2);c.drawString(46,y,sub);y-=14

def bullet(text):
 global y
 p=Paragraph(text,style);w,h=p.wrap(514,200);c.setFont('Times-Roman',10);c.drawString(49,y-1,'\u2022');p.drawOn(c,60,y-h+9);y-=h+4

def gap(n=5):
 global y;y-=n
section('Experience')
role('centrexIT','December 2021 - Present','AI Automation Engineer (2025-present); previously provisioning, field support, and service desk')
bullet('Develop service and client-facing automation from frontline requirements through implementation, rollout, and handoff; translate recurring delivery problems into shared tools, reporting, and operating standards.')
bullet('Build Service Toolbox and Client Toolbox for service workflows and client portfolio reporting. Contribute to the automation program featured by Rewst for recovering 160+ hours monthly and opening a new service line - a team outcome.')
bullet('Took ownership of an inherited 72-ticket provisioning backlog, cleared it within six months, and rebuilt SOPs, inventory tracking, service expectations, and media-sanitization controls.')
bullet('Automated fresh-machine deployment and configuration with Immy.Bot, reducing active technician effort from roughly 45 minutes to two minutes while retaining human quality control.')
bullet('Stewarded provisioning across process improvement, automation, and field logistics; documented and handed off the operation in 2025 after improving efficiency and margin. Received the Quality First Award in 2023.')
bullet('Contributed a public multi-tenant Microsoft 365 reporting workflow combining license inventory, usage, and cost information; shared the implementation through the Rewst community.')
role('Safemark - Service Technician I','September 2018 - April 2021')
bullet('Owned independent field troubleshooting and account support at major attractions and venues; recognized for helping restore the Pechanga relationship. Supported interstate assignments and maintained repair, parts, and travel records.')
gap(2)
section('Selected Engineering')
role('Cadre - Agent Control Plane','TypeScript / PostgreSQL | Alpha')
bullet('Designed a personal control plane for agents with dedicated computer environments, policy-controlled actions, and audit history; connect agent execution to explicit access and operational boundaries.')
bullet('Built the schema and lifecycle for versioned skills and instruction artifacts, including harness-specific CLAUDE.md / AGENTS.md projections and workspace assignment, so operational knowledge can be maintained and reused across agents.')
bullet('Implemented grant-checked connection access and per-connection egress policies. Found credential exposure through browser accessibility snapshots, built a context-scrubbing layer, and documented residual risks.')
role('AMD ROCm Inference Lab','Python / llama.cpp / Radeon R9700')
bullet('Built repeatable Python benchmarks for single- and dual-GPU inference: quantization, tensor/layer splitting, speculative decoding, occupied context, concurrency, and memory-capacity limits.')
bullet('Compiled controlled RCCL-on/off builds and investigated host-bridge transport. Recorded short-request decode near 55 tokens/s with the fallback versus 6.9 with RCCL; retained the fallback for interactive serving on this topology.')
bullet('Compared prefill, decode, and end-to-end latency rather than optimizing one headline rate; documented long-context ingestion costs, KV-cache residency, and concurrent-agent capacity.')
role('TerminalBrain & Shot Pill','Swift / MCP / SSH')
bullet('Built governed MCP access to local notes and screenshot delivery to remote coding environments, giving agents practical context from the tools and machines where the work happens.')
gap(2)
section('Technical Skills & Contributions')
for text in ['<b>Engineering:</b> TypeScript, JavaScript, PostgreSQL, MCP, Git, GitHub Actions','<b>Automation:</b> Rewst, Immy.Bot, PowerShell, Bash, Microsoft Graph, Entra ID, Intune','<b>Inference &amp; development:</b> ROCm, llama.cpp, Python benchmarking, Swift, React',]:
 p=Paragraph(text,style);w,h=p.wrap(520,100);p.drawOn(c,46,y-h+9);y-=h+4
gap(4)
section('Education')
role('University of Maine','Degree incomplete')
p=Paragraph('BBA coursework - Project Management &amp; Information Systems; 90 of 120 credits completed.',style);w,h=p.wrap(530,100);p.drawOn(c,46,y-h+9);y-=h
y-=14
p=Paragraph('<b>Hemet High School</b> - Graduated 2017; Thespian Society member.',style);w,h=p.wrap(530,100);p.drawOn(c,46,y-h+9);y-=h
assert y>25,y
c.save();print(out);print('Bottom position:',y)
