"""Read MicroMan's original WAP sprite/room data; never execute the game.
The source installer is preserved separately. Uses only the Python standard library.
"""
import hashlib, json, pathlib, struct, zipfile, zlib
ROOT=pathlib.Path(__file__).resolve().parent.parent
def png(w,h,pixels):
    def chunk(name,data):return struct.pack('>I',len(data))+name+data+struct.pack('>I',zlib.crc32(name+data))
    scan=b''.join(b'\0'+pixels[y*w*4:(y+1)*w*4] for y in range(h))
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(scan,9))+chunk(b'IEND',b'')
def rle(data,start,w,h,palette):
    p=start;x=y=0;pixels=bytearray(w*h*4)
    def put(index):
        nonlocal x
        if 0<=x<w and 0<=y<h:pixels[((h-1-y)*w+x)*4:((h-1-y)*w+x)*4+4]=bytes((*palette[index],255))
        x+=1
    while p<len(data):
        n,v=data[p:p+2];p+=2
        if n:
            for _ in range(n):put(v)
        elif v==0:x=0;y+=1
        elif v==1:break
        elif v==2:x+=data[p];y+=data[p+1];p+=2
        else:
            for val in data[p:p+v]:put(val)
            p+=v+v%2
    return pixels
def midi(data):
    division=struct.unpack_from('>H',data,12)[0];pos=14;notes=[];tempos=[(0,500000)];end=0
    while pos+8<=len(data) and data[pos:pos+4]==b'MTrk':
        size=struct.unpack_from('>I',data,pos+4)[0];track=data[pos+8:pos+8+size];pos+=8+size;p=0;tick=0;running=0;active={}
        def vlq():
            nonlocal p
            value=0
            while True:
                b=track[p];p+=1;value=(value<<7)|(b&127)
                if b<128:return value
        while p<len(track):
            tick+=vlq();end=max(end,tick);status=track[p]
            if status>=128:p+=1;running=status
            else:status=running
            if status==255:
                kind=track[p];p+=1;n=vlq();payload=track[p:p+n];p+=n
                if kind==81:tempos.append((tick,int.from_bytes(payload,'big')))
                if kind==47:break
            elif status in (240,247):p+=vlq()
            else:
                kind=status>>4;channel=status&15;a=track[p];p+=1;b=0
                if kind not in (12,13):b=track[p];p+=1
                key=(channel,a)
                if kind==9 and b:active[key]=(tick,b)
                elif kind==8 or kind==9 and not b:
                    if key in active:
                        start,velocity=active.pop(key);notes.append([start,tick-start,a,velocity,channel])
    tempos=sorted(dict(tempos).items())
    def seconds(t):
        last=0;tempo=500000;value=0
        for at,new in tempos:
            if at>t:break
            value+=(at-last)*tempo/1e6/division;last=at;tempo=new
        return round(value+(t-last)*tempo/1e6/division,4)
    return {'duration':seconds(end),'notes':sorted([[seconds(t),max(.04,seconds(t+duration)-seconds(t)),pitch,velocity,channel] for t,duration,pitch,velocity,channel in notes])}
def build():
    archive=ROOT/'assets/original-data.zip';z=zipfile.ZipFile(archive);d=z.read('MICRO1.IMG');r=z.read('MICRO1.RMP');out=ROOT/'site/assets';out.mkdir(exist_ok=True)
    palette=[tuple(d[i:i+3][::-1]) for i in range(0,1024,4)];groups={};frames=[];x=y=row=0
    for i in range(256):
        p=1024+i*46;rid,n=struct.unpack_from('<HH',d,p)
        if rid==65535:continue
        w,h=struct.unpack_from('<HH',d,p+28);offset=struct.unpack_from('<I',d,p+38)[0];group={'name':d[p+4:p+20].split(b'\0')[0].decode('latin1'),'frames':[]};groups[str(i)]=group
        for f in range(n):
            if x+w+2>1024:x=0;y+=row+2;row=0
            spec={'x':x,'y':y,'w':w,'h':h};group['frames'].append(spec)
            frame=rle(d,struct.unpack_from('<I',d,offset+f*4)[0],w,h,palette);frames.append((i,spec,frame));x+=w+2;row=max(row,h)
    height=y+row
    for partner in (False,True):
        pixels=bytearray(1024*height*4)
        for group,spec,frame in frames:
            frame=bytearray(frame)
            if partner and group<=4:
                for p in range(0,len(frame),4):
                    rgb=tuple(frame[p:p+3]);new={(0,0,255):(255,173,35),(0,0,192):(197,116,24),(255,0,0):(0,200,188),(192,0,0):(0,137,143)}.get(rgb)
                    if new:frame[p:p+3]=bytes(new)
            for row in range(spec['h']):
                at=((spec['y']+row)*1024+spec['x'])*4;pixels[at:at+spec['w']*4]=frame[row*spec['w']*4:(row+1)*spec['w']*4]
        (out/('partner.png' if partner else 'original.png')).write_bytes(png(1024,height,pixels))
    tiles=[]
    for i in range(256):
        fields=struct.unpack_from('<12h',r,18+i*24);tiles.append({'flags':fields[3],'solid':list(fields[4:8]),'ladder':list(fields[8:12])})
    rooms={}
    for i in range(256):
        p=6168+i*53;rid=struct.unpack_from('<h',r,p)[0]
        if rid<0:continue
        assert rid==i
        tileOffset,objectOffset=struct.unpack_from('<II',r,p+45);count=struct.unpack_from('<H',r,p+37)[0];objects=[]
        for j in range(count):
            fields=list(struct.unpack_from('<51h',r,objectOffset+j*102));objects.append({'id':i*100+j,'x':fields[1],'y':fields[2],'sprite':fields[3]-1,'w':fields[5],'h':fields[6],'behavior':fields[40],'args':fields[10:24],'raw':fields})
        rooms[str(i)]={'id':i,'name':r[p+2:p+22].split(b'\0')[0].decode('latin1'),'links':[v-1 if v else None for v in struct.unpack_from('<4H',r,p+27)],'tiles':[t-1 for t in struct.unpack_from('<256H',r,tileOffset)],'objects':objects}
    manifest={'sourceSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'groups':groups}
    (out/'sprites.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
    (out/'world.json').write_text(json.dumps({'width':512,'height':320,'tileWidth':32,'tileHeight':20,'tiles':tiles,'rooms':rooms},separators=(',',':'))+'\n')
    for n in (1,2,3):(out/f'music{n}.json').write_text(json.dumps(midi(z.read(f'MICRO1.M0{n}')),separators=(',',':'))+'\n')
    (out/'original-intro.wav').write_bytes(z.read('MICRO1.WAV'))
    print(f'Decoded {len(frames)} animation frames, {len(rooms)} original rooms, and 3 MIDI scores.')
if __name__=='__main__':build()
