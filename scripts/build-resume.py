from reportlab.pdfgen import canvas
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.enums import TA_LEFT
from pathlib import Path
out=Path(__file__).resolve().parents[1] / 'output/pdf/Jonathan-Christensen-Resume-Draft.pdf'
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
role('centrexIT','December 2021 - Present','San Diego, CA | Service desk, provisioning, field support, and automation')
bullet('Build automation and internal tools for service delivery, client reporting, and IT operations, informed by hands-on experience supporting the teams that use them.')
bullet('Cleared an inherited 72-ticket provisioning backlog within six months; rebuilt standard operating procedures, inventory tracking, and device preparation workflows.')
bullet('Automated deployment and configuration with Immy.Bot while retaining human quality checks; reduced active technician effort from about 45 minutes to two minutes on the fresh-machine onboarding path.')
bullet('Coordinated provisioning, logistics, and field delivery; documented processes and handed off the operation in 2025 to support continued ownership by the team.')
bullet('Received the centrexIT Quality First Award in 2023 for commitment to quality.')
gap()
role('Safemark - Service Technician I','September 2018 - April 2021','San Diego division | Field service and account support')
bullet('Provided independent customer service, electronic troubleshooting, and hardware repairs at major attractions and venues, including the San Diego Zoo, Safari Park, SeaWorld, and Pechanga.')
bullet('Recognized by managers for helping restore the Pechanga account relationship and rebuild client confidence across the San Diego division.')
bullet('Supported assignments in Denver and Utah in 2019 and Hawaii in February 2020; maintained repair, parts, and travel records and obtained clearance for work at MCRD.')
gap(8)
section('Selected Projects')
role('Service Toolbox & Client Toolbox','centrexIT')
bullet('Built tools for service desk workflows and client portfolio reporting, connecting operational information with the next action a team member needs to take.')
role('Territories','mejohnc.org/projects/territories/')
bullet('Created an interactive library of 50 visual styles with working examples, comparisons, design history, and structured guides and tokens for people and their agents.')
role('Microsoft 365 Reporting','Rewst community contribution')
bullet('Contributed a Microsoft 365 license reporting workflow and shared its implementation through a public Rewst community presentation.')
gap(8)
section('Technical Skills')
for text in ['<b>Automation:</b> Rewst, Immy.Bot, Power Automate, n8n, PowerShell, Bash','<b>Development:</b> JavaScript, TypeScript, React, Astro, HTML/CSS, Git, GitHub Actions','<b>Infrastructure:</b> Microsoft 365, Entra ID, Intune, Microsoft Graph, Windows, macOS, Linux','<b>Operations:</b> Device provisioning, field support, inventory, SOPs, technical handoffs']:
 p=Paragraph(text,style);w,h=p.wrap(520,100);p.drawOn(c,46,y-h+9);y-=h+4
assert y>35,y
c.save();print(out);print('Bottom position:',y)
