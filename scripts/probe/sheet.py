# contact sheet of the frames with a prefix: python3 sheet.py <prefix> <cols>
import sys, glob
from PIL import Image
prefix, cols = sys.argv[1], int(sys.argv[2])
files = sorted(glob.glob(f'{prefix}-*.jpg'))
ims = [Image.open(f).resize((480, 300)) for f in files]
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * 480, rows * 300))
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * 480, (i // cols) * 300))
sheet.save(f'{prefix}-sheet.jpg', quality=72)
print(len(ims), 'frames')
