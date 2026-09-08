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
section('Profile')
p=Paragraph('Automation engineer building agent tooling, governed context access, and reusable operational workflows. Experience spans customer-facing IT delivery, TypeScript/PostgreSQL systems, MCP integrations, and public technical contributions.',style);w,h=p.wrap(530,100);p.drawOn(c,46,y-h+9);y-=h+15
section('Selected Engineering')
role('Cadre - Agent Control Plane','Personal project | Alpha')
bullet('Designed a versioned artifact registry for reusable agent instructions, with harness-specific projections into CLAUDE.md and AGENTS.md and assignment to agent workspaces.')
bullet('Implemented grant-checked connection access, per-connection egress policies, and action audit records to govern agent access to external systems.')
bullet('Identified credential exposure through browser accessibility snapshots; built a context-scrubbing layer and documented residual risks.')
role('AMD ROCm Inference Lab','Personal infrastructure')
bullet('Built Python inference benchmarks for single- and dual-R9700 systems; compared quantization, tensor/layer splitting, speculative decoding, and long-context behavior on llama.cpp/ROCm.')
bullet('Investigated RCCL transport and decode regressions with controlled builds; selected serving configurations using prefill, generation, and end-to-end latency measurements.')
role('TerminalBrain & Shot Pill','Public agent tooling')
bullet('Built MCP access to Apple Notes, Drafts, and Obsidian with governed writeback; delivered screenshot context from macOS to remote coding workflows over SSH.')
role('Territories','Public reference and agent resources')
bullet('Published 50 style guides with structured tokens, versioned resource paths, and reusable agent handoffs; automated checks cover resource parity, example/token consistency, and 72 picker combinations.')
gap(6)
section('Experience')
role('centrexIT','December 2021 - Present','San Diego, CA | Service desk, provisioning, field support, and automation')
bullet('Build internal service tools, Microsoft 365 reporting, and AI-assisted workflows with the teams that use them, connecting field problems to implementation and operational handoffs.')
bullet('Cleared an inherited 72-ticket provisioning backlog within six months and rebuilt SOPs, inventory tracking, and device preparation workflows.')
bullet('Automated deployment with Immy.Bot while retaining human quality checks; reduced active technician effort from about 45 minutes to two minutes on the fresh-machine onboarding path.')
bullet('Documented and handed off provisioning operations in 2025. Received the centrexIT Quality First Award in 2023.')
role('Safemark - Service Technician I','September 2018 - April 2021')
bullet('Delivered independent field troubleshooting and account support across major San Diego venues and interstate assignments; recognized for helping restore the Pechanga account relationship.')
gap(6)
section('Technical Skills & Contributions')
for text in ['<b>Engineering:</b> TypeScript, JavaScript, PostgreSQL, MCP, Git, GitHub Actions','<b>Automation:</b> Rewst, Immy.Bot, PowerShell, Bash, Microsoft Graph, Entra ID, Intune','<b>Inference &amp; development:</b> ROCm, llama.cpp, Python benchmarking, Swift, React','<b>Community:</b> Public Rewst Microsoft 365 reporting workflow and implementation presentation']:
 p=Paragraph(text,style);w,h=p.wrap(520,100);p.drawOn(c,46,y-h+9);y-=h+4
assert y>35,y
c.save();print(out);print('Bottom position:',y)
